"""
Полная синхронизация с vsDesk.
Actions (query param ?action=):
  - statuses  : вернуть список уникальных статусов из vsDesk + текущий маппинг
  - mapping   : GET текущий маппинг / POST сохранить маппинг
  - count     : GET — количество подлежащих синхронизации заявок
  - sync      : POST — обработать пачку заявок (offset, limit)
По умолчанию (без action) — sync с offset=0, limit=50.
"""
import json
import os
import re
import base64
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
import urllib.error
from datetime import datetime
from typing import Optional, List, Dict, Any

import boto3

DATABASE_URL = os.environ.get('DATABASE_URL')
SCHEMA = os.environ.get('MAIN_DB_SCHEMA')
VSDESK_URL = os.environ.get('VSDESK_URL', 'https://help.dreamteamcompany.ru').rstrip('/')
VSDESK_LOGIN = os.environ.get('VSDESK_LOGIN')
VSDESK_PASSWORD = os.environ.get('VSDESK_PASSWORD')

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')

S3_BUCKET = 'files'
S3_ENDPOINT = 'https://bucket.poehali.dev'
CDN_BASE = f'https://cdn.poehali.dev/projects/{AWS_ACCESS_KEY_ID}/bucket' if AWS_ACCESS_KEY_ID else ''


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id, Authorization',
        'Access-Control-Max-Age': '86400',
    }


def api_response(status_code: int, body: dict) -> dict:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', **cors_headers()},
        'body': json.dumps(body, ensure_ascii=False, default=str),
        'isBase64Encoded': False,
    }


def get_db():
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor,
        options=f'-c search_path={SCHEMA},public'
    )


def basic_auth_header() -> str:
    credentials = f'{VSDESK_LOGIN}:{VSDESK_PASSWORD}'
    encoded = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
    return f'Basic {encoded}'


def strip_html(text: str) -> str:
    if not text:
        return ''
    return re.sub(r'<[^>]+>', '', text).strip()


def vsdesk_raw(path: str):
    url = f'{VSDESK_URL}{path}'
    req = urllib.request.Request(url, headers={
        'Authorization': basic_auth_header(),
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode('utf-8-sig'))


def vsdesk_list(path: str) -> list:
    data = vsdesk_raw(path)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get('requests') or data.get('items') or data.get('data') or []
    return []


def vsdesk_download(path: str) -> Optional[bytes]:
    if not path:
        return None
    url = path if path.startswith('http') else f'{VSDESK_URL}{path}'
    try:
        req = urllib.request.Request(url, headers={'Authorization': basic_auth_header()})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    except Exception:
        return None


def map_priority(priority_str: str) -> int:
    m = {
        'низкий': 5, 'low': 5,
        'средний': 2, 'normal': 2, 'medium': 2,
        'высокий': 3, 'high': 3,
        'критический': 4, 'critical': 4, 'urgent': 4,
    }
    return m.get((priority_str or '').lower().strip(), 2)


def parse_ts(ts_raw: str):
    if not ts_raw:
        return None
    for fmt in ('%Y-%m-%d %H:%M:%S', '%d.%m.%Y %H:%M:%S', '%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(ts_raw, fmt)
        except Exception:
            continue
    return None


def get_s3_client():
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        return None
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )


def upload_to_s3(content: bytes, filename: str) -> Optional[str]:
    s3 = get_s3_client()
    if not s3 or not content:
        return None
    safe_name = re.sub(r'[^\w.\-]', '_', filename or 'file') or 'file'
    key = f'vsdesk/{uuid.uuid4().hex}_{safe_name}'
    try:
        s3.put_object(Bucket=S3_BUCKET, Key=key, Body=content)
        return f'{CDN_BASE}/{key}'
    except Exception:
        return None


# =====================================================================
# Маппинг статусов
# =====================================================================

def load_status_mapping(conn) -> Dict[str, Dict[str, Any]]:
    """{vsdesk_status_lower: {status_id, sync_enabled, vsdesk_status}}"""
    res: Dict[str, Dict[str, Any]] = {}
    with conn.cursor() as cur:
        cur.execute("SELECT vsdesk_status, status_id, sync_enabled FROM vsdesk_status_mapping")
        for row in cur.fetchall():
            res[(row['vsdesk_status'] or '').strip().lower()] = {
                'vsdesk_status': row['vsdesk_status'],
                'status_id': row['status_id'],
                'sync_enabled': row['sync_enabled'],
            }
    return res


def get_default_status_id(conn) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM ticket_statuses WHERE is_open = TRUE ORDER BY id LIMIT 1")
        row = cur.fetchone()
        if row:
            return row['id']
        cur.execute("SELECT id FROM ticket_statuses ORDER BY id LIMIT 1")
        row = cur.fetchone()
        return row['id'] if row else None


# =====================================================================
# Пользователи: поиск/создание
# =====================================================================

def normalize_email(s: Any) -> str:
    if not s:
        return ''
    s = str(s).strip().lower()
    return s if '@' in s else ''


def find_or_create_user(conn, email: str = '', full_name: str = '',
                        vsdesk_user_id: str = '') -> Optional[int]:
    """Ищет пользователя по email -> external_id -> full_name; иначе создаёт без пароля."""
    email_n = normalize_email(email)
    full_name = (full_name or '').strip()
    vsdesk_user_id = (str(vsdesk_user_id) if vsdesk_user_id else '').strip()

    if not email_n and not full_name and not vsdesk_user_id:
        return None

    with conn.cursor() as cur:
        if email_n:
            cur.execute("SELECT id FROM users WHERE LOWER(email) = %s LIMIT 1", (email_n,))
            row = cur.fetchone()
            if row:
                return row['id']

        if vsdesk_user_id:
            cur.execute(
                "SELECT id FROM users WHERE external_source='vsdesk' AND external_id=%s LIMIT 1",
                (vsdesk_user_id,)
            )
            row = cur.fetchone()
            if row:
                return row['id']

        if full_name:
            cur.execute("SELECT id FROM users WHERE LOWER(full_name) = LOWER(%s) LIMIT 1", (full_name,))
            row = cur.fetchone()
            if row:
                return row['id']

        # Создаём нового
        email_for_db = email_n or f'vsdesk_{vsdesk_user_id or uuid.uuid4().hex[:8]}@imported.local'
        username = re.sub(r'[^a-z0-9_]', '_', email_for_db.split('@')[0])[:90] or f'vsdesk_{uuid.uuid4().hex[:8]}'
        # email/username уникальные — добавим суффикс если занято
        cur.execute("SELECT 1 FROM users WHERE email = %s OR username = %s", (email_for_db, username))
        if cur.fetchone():
            suffix = uuid.uuid4().hex[:6]
            email_for_db = email_for_db.replace('@', f'+{suffix}@')
            username = f'{username}_{suffix}'

        cur.execute(
            """INSERT INTO users
               (email, password_hash, full_name, username, is_active, can_login,
                external_source, external_id, auto_registered)
               VALUES (%s, 'NO_LOGIN', %s, %s, TRUE, FALSE, 'vsdesk', %s, TRUE)
               RETURNING id""",
            (email_for_db, full_name or email_for_db, username, vsdesk_user_id or None)
        )
        return cur.fetchone()['id']


# =====================================================================
# Импорт одной заявки целиком
# =====================================================================

def import_one_ticket(conn, ext_id: str, mapping: Dict[str, Dict[str, Any]],
                       default_status_id: Optional[int],
                       system_user_id: int) -> Dict[str, Any]:
    """Возвращает {'status': 'inserted'|'skipped'|'filtered'|'error', 'reason': str}"""
    result = {'status': 'error', 'reason': ''}

    with conn.cursor() as cur:
        # Уже есть?
        cur.execute(
            "SELECT id FROM tickets WHERE external_source='vsdesk' AND external_id=%s LIMIT 1",
            (ext_id,)
        )
        if cur.fetchone():
            return {'status': 'skipped', 'reason': 'already_imported'}

    # Детальный запрос
    try:
        req = vsdesk_raw(f'/api/requests/{ext_id}/')
    except Exception as e:
        return {'status': 'error', 'reason': f'fetch_failed: {e}'}

    if not isinstance(req, dict):
        return {'status': 'error', 'reason': 'invalid_response'}

    status_raw = (req.get('Status') or '').strip()
    status_key = status_raw.lower()
    map_row = mapping.get(status_key)
    if not map_row or not map_row.get('sync_enabled'):
        return {'status': 'filtered', 'reason': f'status_not_enabled:{status_raw}'}

    target_status_id = map_row.get('status_id') or default_status_id
    if not target_status_id:
        return {'status': 'error', 'reason': 'no_target_status'}

    title = (req.get('Name') or 'Без темы')[:500]
    description = strip_html(req.get('Content') or '')
    due_date = req.get('timestampEnd') or None
    created_at = req.get('timestamp') or None
    priority_id = map_priority(req.get('Priority') or '')

    author_email = req.get('UserEmail') or req.get('AuthorEmail') or ''
    author_name = req.get('UserName') or req.get('Author') or req.get('FIO') or ''
    author_vsdesk_id = str(req.get('user_id') or req.get('UserId') or '')
    created_by_user = find_or_create_user(conn, author_email, author_name, author_vsdesk_id) or system_user_id

    executor_email = req.get('ExecutorEmail') or req.get('ExpertEmail') or ''
    executor_name = req.get('Executor') or req.get('Expert') or ''
    executor_vsdesk_id = str(req.get('executor_id') or req.get('expert_id') or '')
    assigned_to = None
    if executor_name or executor_email or executor_vsdesk_id:
        assigned_to = find_or_create_user(conn, executor_email, executor_name, executor_vsdesk_id)

    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO tickets
               (title, description, status_id, priority_id, created_by, assigned_to,
                due_date, created_at, external_id, external_source)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'vsdesk')
               RETURNING id""",
            (title, description, target_status_id, priority_id, created_by_user,
             assigned_to, due_date, created_at, ext_id)
        )
        local_id = cur.fetchone()['id']

    counters = {'comments': 0, 'attachments': 0, 'history': 0, 'watchers': 0, 'custom_fields': 0}

    # Комментарии (subs)
    for c in (req.get('subs') or []):
        try:
            ext_comment_id = str(c.get('id') or '')
            text = strip_html(c.get('comment') or '')
            if not text and not (c.get('files') or c.get('file')):
                continue
            ts_raw = c.get('timestamp') or ''
            c_created = parse_ts(ts_raw)
            is_internal = bool(c.get('show') == 1)
            c_email = c.get('UserEmail') or ''
            c_name = c.get('UserName') or c.get('Author') or ''
            c_vsdesk_id = str(c.get('user_id') or '')
            comment_user = find_or_create_user(conn, c_email, c_name, c_vsdesk_id) or system_user_id

            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO ticket_comments
                       (ticket_id, user_id, comment, is_internal, created_at, external_id, external_source)
                       VALUES (%s, %s, %s, %s, %s, %s, 'vsdesk')
                       RETURNING id""",
                    (local_id, comment_user, text or '(вложение)', is_internal, c_created, ext_comment_id or None)
                )
                new_comment_id = cur.fetchone()['id']
            counters['comments'] += 1

            for f in (c.get('files') or []):
                fname = f.get('name') or f.get('filename') or 'file'
                furl = f.get('url') or f.get('path') or ''
                content = vsdesk_download(furl) if furl else None
                final_url = upload_to_s3(content, fname) if content else (furl if furl.startswith('http') else f'{VSDESK_URL}{furl}')
                fsize = f.get('size') or (len(content) if content else 0)
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO comment_attachments
                           (comment_id, filename, url, size, external_id, external_source)
                           VALUES (%s, %s, %s, %s, %s, 'vsdesk')""",
                        (new_comment_id, fname, final_url, fsize, str(f.get('id') or ''))
                    )
                counters['attachments'] += 1
        except Exception:
            continue

    # Вложения самой заявки
    for f in (req.get('files') or []):
        try:
            fname = f.get('name') or f.get('filename') or 'file'
            furl = f.get('url') or f.get('path') or ''
            content = vsdesk_download(furl) if furl else None
            final_url = upload_to_s3(content, fname) if content else (furl if furl.startswith('http') else f'{VSDESK_URL}{furl}')
            fsize = f.get('size') or (len(content) if content else 0)
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO ticket_attachments
                       (ticket_id, filename, url, size, uploaded_by, external_id, external_source)
                       VALUES (%s, %s, %s, %s, %s, %s, 'vsdesk')""",
                    (local_id, fname, final_url, fsize, created_by_user, str(f.get('id') or ''))
                )
            counters['attachments'] += 1
        except Exception:
            continue

    # Наблюдатели
    watchers = req.get('watchers') or req.get('observers') or []
    for w in watchers:
        try:
            w_email = w.get('email') if isinstance(w, dict) else ''
            w_name = (w.get('name') or w.get('full_name') or '') if isinstance(w, dict) else str(w)
            w_id = str(w.get('id') or '') if isinstance(w, dict) else ''
            wu = find_or_create_user(conn, w_email, w_name, w_id)
            if wu:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO ticket_watchers (ticket_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (local_id, wu)
                    )
                counters['watchers'] += 1
        except Exception:
            continue

    # История
    history = req.get('history') or req.get('log') or []
    for h in history:
        try:
            h_email = h.get('UserEmail') or ''
            h_name = h.get('UserName') or h.get('user') or ''
            h_vid = str(h.get('user_id') or '')
            hu = find_or_create_user(conn, h_email, h_name, h_vid) or system_user_id
            field_name = (h.get('field') or h.get('action') or 'change')[:100]
            old_v = h.get('old_value') or h.get('from') or ''
            new_v = h.get('new_value') or h.get('to') or h.get('value') or ''
            h_ts = parse_ts(h.get('timestamp') or '')
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO ticket_history
                       (ticket_id, user_id, field_name, old_value, new_value, created_at, external_id, external_source)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, 'vsdesk')""",
                    (local_id, hu, field_name, str(old_v) if old_v else None,
                     str(new_v) if new_v else None, h_ts, str(h.get('id') or ''))
                )
            counters['history'] += 1
        except Exception:
            continue

    # Кастомные поля
    custom_fields = req.get('custom_fields') or req.get('fields') or {}
    if isinstance(custom_fields, dict):
        custom_items = list(custom_fields.items())
    elif isinstance(custom_fields, list):
        custom_items = [((cf.get('name') or cf.get('field') or ''), cf.get('value')) for cf in custom_fields if isinstance(cf, dict)]
    else:
        custom_items = []
    for name, value in custom_items:
        if not name:
            continue
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id FROM ticket_custom_fields WHERE LOWER(name) = LOWER(%s) LIMIT 1",
                    (str(name),)
                )
                row = cur.fetchone()
                if row:
                    field_id = row['id']
                else:
                    cur.execute(
                        """INSERT INTO ticket_custom_fields (name, field_type, is_required)
                           VALUES (%s, 'text', FALSE) RETURNING id""",
                        (str(name)[:255],)
                    )
                    field_id = cur.fetchone()['id']
                cur.execute(
                    """INSERT INTO ticket_custom_field_values (ticket_id, field_id, value, external_source)
                       VALUES (%s, %s, %s, 'vsdesk')""",
                    (local_id, field_id, '' if value is None else str(value))
                )
            counters['custom_fields'] += 1
        except Exception:
            continue

    conn.commit()
    return {'status': 'inserted', 'local_id': local_id, 'counters': counters}


# =====================================================================
# Actions
# =====================================================================

def get_system_user_id(conn) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM users WHERE external_source='vsdesk' AND external_id='system' LIMIT 1"
        )
        row = cur.fetchone()
        if row:
            return row['id']
        cur.execute("SELECT id FROM users ORDER BY id LIMIT 1")
        row = cur.fetchone()
        return row['id'] if row else 1


def action_statuses(conn) -> dict:
    """Список уникальных статусов в vsDesk + текущий маппинг"""
    try:
        all_req = vsdesk_list('/api/requests/')
    except Exception as e:
        return {'error': f'vsdesk_unreachable: {e}'}

    seen: Dict[str, int] = {}
    for r in all_req:
        s = (r.get('Status') or '').strip()
        if not s:
            continue
        seen[s] = seen.get(s, 0) + 1

    mapping = load_status_mapping(conn)
    items = []
    for s, cnt in sorted(seen.items(), key=lambda x: -x[1]):
        m = mapping.get(s.lower(), {})
        items.append({
            'vsdesk_status': s,
            'count': cnt,
            'status_id': m.get('status_id'),
            'sync_enabled': bool(m.get('sync_enabled', False)),
        })
    return {'statuses': items, 'total_tickets': len(all_req)}


def action_save_mapping(conn, body: dict) -> dict:
    items = body.get('mapping') or []
    if not isinstance(items, list):
        return {'error': 'mapping must be array'}
    saved = 0
    with conn.cursor() as cur:
        for it in items:
            vs = (it.get('vsdesk_status') or '').strip()
            if not vs:
                continue
            status_id = it.get('status_id')
            sync_enabled = bool(it.get('sync_enabled'))
            cur.execute(
                """INSERT INTO vsdesk_status_mapping (vsdesk_status, status_id, sync_enabled, updated_at)
                   VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                   ON CONFLICT (vsdesk_status) DO UPDATE
                   SET status_id = EXCLUDED.status_id,
                       sync_enabled = EXCLUDED.sync_enabled,
                       updated_at = CURRENT_TIMESTAMP""",
                (vs, status_id if status_id else None, sync_enabled)
            )
            saved += 1
    conn.commit()
    return {'success': True, 'saved': saved}


def action_get_mapping(conn) -> dict:
    return {'mapping': list(load_status_mapping(conn).values())}


def collect_eligible_ext_ids(conn) -> List[str]:
    """Возвращает список ext_id заявок vsDesk, подлежащих синхронизации (по маппингу), которых ещё нет у нас."""
    try:
        all_req = vsdesk_list('/api/requests/')
    except Exception:
        return []
    mapping = load_status_mapping(conn)
    enabled_statuses = {k for k, v in mapping.items() if v.get('sync_enabled')}
    with conn.cursor() as cur:
        cur.execute("SELECT external_id FROM tickets WHERE external_source='vsdesk' AND external_id IS NOT NULL")
        existing = {row['external_id'] for row in cur.fetchall()}
    out = []
    for r in all_req:
        ext_id = str(r.get('id') or '')
        status = (r.get('Status') or '').strip().lower()
        if not ext_id or ext_id in existing:
            continue
        if status not in enabled_statuses:
            continue
        out.append(ext_id)
    out.sort(key=lambda x: int(x) if x.isdigit() else 0)
    return out


def action_count(conn) -> dict:
    ids = collect_eligible_ext_ids(conn)
    return {'pending': len(ids)}


def action_dry_run(conn) -> dict:
    """Считает, сколько заявок и связанных сущностей будет импортировано, без записи в БД."""
    try:
        all_req = vsdesk_list('/api/requests/')
    except Exception as e:
        return {'error': f'vsdesk_unreachable: {e}'}

    mapping = load_status_mapping(conn)
    enabled_statuses = {k for k, v in mapping.items() if v.get('sync_enabled')}

    with conn.cursor() as cur:
        cur.execute("SELECT external_id FROM tickets WHERE external_source='vsdesk' AND external_id IS NOT NULL")
        existing = {row['external_id'] for row in cur.fetchall()}

    eligible_ids: List[str] = []
    by_status: Dict[str, int] = {}
    skipped_existing = 0
    skipped_filtered = 0
    no_status_raw = 0

    for r in all_req:
        ext_id = str(r.get('id') or '')
        status_raw = (r.get('Status') or '').strip()
        if not ext_id:
            continue
        if not status_raw:
            no_status_raw += 1
            continue
        if ext_id in existing:
            skipped_existing += 1
            continue
        if status_raw.lower() not in enabled_statuses:
            skipped_filtered += 1
            continue
        eligible_ids.append(ext_id)
        by_status[status_raw] = by_status.get(status_raw, 0) + 1

    # Семплируем первые N для оценки объёма деталей
    SAMPLE_LIMIT = 5
    sample_ids = eligible_ids[:SAMPLE_LIMIT]
    sample_stats = {
        'sampled': 0,
        'comments': 0,
        'attachments': 0,
        'history': 0,
        'watchers': 0,
        'custom_fields': 0,
        'errors': 0,
    }
    for ext in sample_ids:
        try:
            d = vsdesk_raw(f'/api/requests/{ext}/')
        except Exception:
            sample_stats['errors'] += 1
            continue
        if not isinstance(d, dict):
            sample_stats['errors'] += 1
            continue
        sample_stats['sampled'] += 1
        subs = d.get('subs') or []
        sample_stats['comments'] += len(subs)
        att_in_subs = sum(len(c.get('files') or []) for c in subs if isinstance(c, dict))
        sample_stats['attachments'] += len(d.get('files') or []) + att_in_subs
        sample_stats['history'] += len(d.get('history') or d.get('log') or [])
        sample_stats['watchers'] += len(d.get('watchers') or d.get('observers') or [])
        cf = d.get('custom_fields') or d.get('fields') or {}
        if isinstance(cf, dict):
            sample_stats['custom_fields'] += len(cf)
        elif isinstance(cf, list):
            sample_stats['custom_fields'] += len(cf)

    # Прогноз: среднее × кол-во заявок
    forecast = {}
    if sample_stats['sampled'] > 0 and eligible_ids:
        for key in ('comments', 'attachments', 'history', 'watchers', 'custom_fields'):
            avg = sample_stats[key] / sample_stats['sampled']
            forecast[key] = round(avg * len(eligible_ids))

    return {
        'total_in_vsdesk': len(all_req),
        'will_import': len(eligible_ids),
        'already_imported': skipped_existing,
        'filtered_by_status': skipped_filtered,
        'no_status_raw': no_status_raw,
        'by_status': [{'vsdesk_status': k, 'count': v} for k, v in sorted(by_status.items(), key=lambda x: -x[1])],
        'sample': {
            'sampled_tickets': sample_stats['sampled'],
            'comments': sample_stats['comments'],
            'attachments': sample_stats['attachments'],
            'history': sample_stats['history'],
            'watchers': sample_stats['watchers'],
            'custom_fields': sample_stats['custom_fields'],
        },
        'forecast': forecast,
    }


def action_sync_batch(conn, offset: int, limit: int) -> dict:
    ids = collect_eligible_ext_ids(conn)
    total = len(ids)
    batch = ids[offset:offset + limit]
    mapping = load_status_mapping(conn)
    default_status = get_default_status_id(conn)
    sys_user = get_system_user_id(conn)
    stats = {'inserted': 0, 'skipped': 0, 'filtered': 0, 'errors': 0, 'details': []}
    for ext in batch:
        res = import_one_ticket(conn, ext, mapping, default_status, sys_user)
        stats[res['status'] if res['status'] in ('inserted', 'skipped', 'filtered') else 'errors'] += 1
        if res.get('status') == 'error':
            stats['details'].append({'ext_id': ext, 'reason': res.get('reason')})
    next_offset = offset + len(batch)
    done = next_offset >= total
    return {
        'success': True,
        'total': total,
        'processed': next_offset,
        'next_offset': next_offset,
        'done': done,
        'batch_size': len(batch),
        **stats,
    }


# =====================================================================
# Handler
# =====================================================================

def handler(event: dict, context) -> dict:
    """vsDesk: настройки маппинга и батч-синхронизация заявок, комментариев, файлов, истории и наблюдателей."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    if not VSDESK_LOGIN or not VSDESK_PASSWORD:
        return api_response(500, {'error': 'VSDESK_LOGIN / VSDESK_PASSWORD не заданы'})

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip().lower()

    try:
        body = json.loads(event.get('body') or '{}') if event.get('body') else {}
    except Exception:
        body = {}

    conn = get_db()
    try:
        if action == 'statuses' and method == 'GET':
            return api_response(200, action_statuses(conn))

        if action == 'mapping' and method == 'GET':
            return api_response(200, action_get_mapping(conn))

        if action == 'mapping' and method == 'POST':
            return api_response(200, action_save_mapping(conn, body))

        if action == 'count' and method == 'GET':
            return api_response(200, action_count(conn))

        if action == 'dry_run' and method == 'GET':
            return api_response(200, action_dry_run(conn))

        if action in ('sync', '') and method in ('GET', 'POST'):
            try:
                offset = int(body.get('offset') if 'offset' in body else params.get('offset', 0))
            except Exception:
                offset = 0
            try:
                limit = int(body.get('limit') if 'limit' in body else params.get('limit', 25))
            except Exception:
                limit = 25
            if limit <= 0 or limit > 100:
                limit = 25
            return api_response(200, action_sync_batch(conn, offset, limit))

        return api_response(400, {'error': f'unknown action: {action}'})
    except Exception as e:
        return api_response(500, {'error': str(e)})
    finally:
        conn.close()