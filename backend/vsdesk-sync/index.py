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
    """Ищет пользователя ПРИОРИТЕТНО по full_name (как просил заказчик),
    далее по email и external_id. Если не нашли — создаёт нового с can_login=TRUE
    и password_hash='NO_LOGIN' (вход только через 'Забыли пароль')."""
    email_n = normalize_email(email)
    full_name = (full_name or '').strip()
    vsdesk_user_id = (str(vsdesk_user_id) if vsdesk_user_id else '').strip()

    if not email_n and not full_name and not vsdesk_user_id:
        return None

    with conn.cursor() as cur:
        # 1. Приоритет — по full_name (TRIM + регистронезависимо)
        if full_name:
            cur.execute(
                "SELECT id FROM users WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(%s)) "
                "AND COALESCE(external_id, '') <> 'system' LIMIT 1",
                (full_name,)
            )
            row = cur.fetchone()
            if row:
                return row['id']

        # 2. По email
        if email_n:
            cur.execute(
                "SELECT id FROM users WHERE LOWER(email) = %s "
                "AND COALESCE(external_id, '') <> 'system' LIMIT 1",
                (email_n,)
            )
            row = cur.fetchone()
            if row:
                return row['id']

        # 3. По external_id vsDesk
        if vsdesk_user_id:
            cur.execute(
                "SELECT id FROM users WHERE external_source='vsdesk' AND external_id=%s "
                "AND COALESCE(external_id, '') <> 'system' LIMIT 1",
                (vsdesk_user_id,)
            )
            row = cur.fetchone()
            if row:
                return row['id']

        # 4. Создаём нового — обязательно хотя бы что-то одно есть
        email_for_db = email_n or f'vsdesk_{vsdesk_user_id or uuid.uuid4().hex[:8]}@imported.local'
        username_base = re.sub(r'[^a-z0-9_]', '_', email_for_db.split('@')[0])[:90] or f'vsdesk_{uuid.uuid4().hex[:8]}'
        username = username_base
        cur.execute("SELECT 1 FROM users WHERE email = %s OR username = %s", (email_for_db, username))
        if cur.fetchone():
            suffix = uuid.uuid4().hex[:6]
            email_for_db = email_for_db.replace('@', f'+{suffix}@')
            username = f'{username_base}_{suffix}'

        cur.execute(
            """INSERT INTO users
               (email, password_hash, full_name, username, is_active, can_login,
                external_source, external_id, auto_registered)
               VALUES (%s, 'NO_LOGIN', %s, %s, TRUE, TRUE, 'vsdesk', %s, TRUE)
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

    # Признак "закрытого" статуса -> архивация
    is_archived_flag = False
    closed_at_value = None
    with conn.cursor() as cur:
        cur.execute(
            "SELECT is_closed, is_open FROM ticket_statuses WHERE id = %s",
            (target_status_id,)
        )
        st = cur.fetchone()
        if st:
            is_archived_flag = bool(st.get('is_closed')) or (st.get('is_open') is False and not st.get('is_open'))
            # Берём только явный is_closed = TRUE
            is_archived_flag = bool(st.get('is_closed'))

    title = (req.get('Name') or 'Без темы')[:500]
    description = strip_html(req.get('Content') or '')
    due_date = req.get('timestampEnd') or None
    created_at = req.get('timestamp') or None
    priority_id = map_priority(req.get('Priority') or '')

    if is_archived_flag:
        closed_at_value = req.get('timestampClose') or req.get('timestampEnd') or created_at

    author_email = req.get('UserEmail') or req.get('AuthorEmail') or ''
    author_name = req.get('UserName') or req.get('Author') or req.get('FIO') or ''
    author_vsdesk_id = str(req.get('user_id') or req.get('UserId') or '')
    # Fallback на технического юзера — только если совсем нет данных об авторе
    created_by_user = find_or_create_user(conn, author_email, author_name, author_vsdesk_id) or system_user_id

    executor_email = req.get('ExecutorEmail') or req.get('ExpertEmail') or ''
    executor_name = req.get('Executor') or req.get('Expert') or ''
    executor_vsdesk_id = str(req.get('executor_id') or req.get('expert_id') or '')
    assigned_to = None
    if executor_name or executor_email or executor_vsdesk_id:
        assigned_to = find_or_create_user(conn, executor_email, executor_name, executor_vsdesk_id)

    # Пытаемся сохранить номер заявки = vsDesk id
    explicit_id: Optional[int] = None
    if ext_id.isdigit():
        candidate = int(ext_id)
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM tickets WHERE id = %s", (candidate,))
            if not cur.fetchone():
                explicit_id = candidate

    with conn.cursor() as cur:
        if explicit_id is not None:
            cur.execute(
                """INSERT INTO tickets
                   (id, title, description, status_id, priority_id, created_by, assigned_to,
                    due_date, created_at, closed_at, is_archived, external_id, external_source)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'vsdesk')
                   RETURNING id""",
                (explicit_id, title, description, target_status_id, priority_id,
                 created_by_user, assigned_to, due_date, created_at,
                 closed_at_value, is_archived_flag, ext_id)
            )
        else:
            cur.execute(
                """INSERT INTO tickets
                   (title, description, status_id, priority_id, created_by, assigned_to,
                    due_date, created_at, closed_at, is_archived, external_id, external_source)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'vsdesk')
                   RETURNING id""",
                (title, description, target_status_id, priority_id, created_by_user,
                 assigned_to, due_date, created_at,
                 closed_at_value, is_archived_flag, ext_id)
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
# Обновление уже импортированной заявки (delta)
# =====================================================================

def update_one_ticket(conn, ext_id: str, mapping: Dict[str, Dict[str, Any]],
                       default_status_id: Optional[int],
                       system_user_id: int) -> Dict[str, Any]:
    """Догружает изменения для уже импортированной заявки. vsDesk — источник истины."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM tickets WHERE external_source='vsdesk' AND external_id=%s LIMIT 1",
            (ext_id,)
        )
        row = cur.fetchone()
        if not row:
            return {'status': 'skipped', 'reason': 'not_imported_yet'}
        local_id = row['id']

    try:
        req = vsdesk_raw(f'/api/requests/{ext_id}/')
    except Exception as e:
        return {'status': 'error', 'reason': f'fetch_failed: {e}'}

    if not isinstance(req, dict):
        return {'status': 'error', 'reason': 'invalid_response'}

    status_raw = (req.get('Status') or '').strip()
    status_key = status_raw.lower()
    map_row = mapping.get(status_key)

    # Маппинг может отсутствовать (статус изменился). Не падаем: оставляем текущий статус.
    target_status_id = (map_row.get('status_id') if map_row else None) or None
    is_archived_flag: Optional[bool] = None
    closed_at_value = None
    if target_status_id:
        with conn.cursor() as cur:
            cur.execute("SELECT is_closed FROM ticket_statuses WHERE id = %s", (target_status_id,))
            st = cur.fetchone()
            if st:
                is_archived_flag = bool(st.get('is_closed'))
                if is_archived_flag:
                    closed_at_value = req.get('timestampClose') or req.get('timestampEnd') or None

    title = (req.get('Name') or 'Без темы')[:500]
    description = strip_html(req.get('Content') or '')
    due_date = req.get('timestampEnd') or None
    priority_id = map_priority(req.get('Priority') or '')

    author_email = req.get('UserEmail') or req.get('AuthorEmail') or ''
    author_name = req.get('UserName') or req.get('Author') or req.get('FIO') or ''
    author_vsdesk_id = str(req.get('user_id') or req.get('UserId') or '')
    author_user = find_or_create_user(conn, author_email, author_name, author_vsdesk_id)

    executor_email = req.get('ExecutorEmail') or req.get('ExpertEmail') or ''
    executor_name = req.get('Executor') or req.get('Expert') or ''
    executor_vsdesk_id = str(req.get('executor_id') or req.get('expert_id') or '')
    assigned_to = None
    if executor_name or executor_email or executor_vsdesk_id:
        assigned_to = find_or_create_user(conn, executor_email, executor_name, executor_vsdesk_id)

    # UPDATE заявки
    update_parts = ['title = %s', 'description = %s', 'priority_id = %s', 'due_date = %s',
                    'updated_at = CURRENT_TIMESTAMP']
    update_vals: List[Any] = [title, description, priority_id, due_date]

    if target_status_id is not None:
        update_parts.append('status_id = %s')
        update_vals.append(target_status_id)
    if is_archived_flag is not None:
        update_parts.append('is_archived = %s')
        update_vals.append(is_archived_flag)
        if is_archived_flag and closed_at_value:
            update_parts.append('closed_at = %s')
            update_vals.append(closed_at_value)
    if assigned_to is not None:
        update_parts.append('assigned_to = %s')
        update_vals.append(assigned_to)
    if author_user is not None:
        update_parts.append('created_by = %s')
        update_vals.append(author_user)

    update_vals.append(local_id)
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE tickets SET {', '.join(update_parts)} WHERE id = %s",
            tuple(update_vals)
        )

    counters = {'comments': 0, 'attachments': 0, 'history': 0, 'watchers': 0, 'custom_fields': 0}

    # === Новые комментарии ===
    with conn.cursor() as cur:
        cur.execute(
            "SELECT external_id FROM ticket_comments WHERE ticket_id=%s AND external_source='vsdesk' AND external_id IS NOT NULL",
            (local_id,)
        )
        existing_comments = {r['external_id'] for r in cur.fetchall()}

    for c in (req.get('subs') or []):
        try:
            ext_comment_id = str(c.get('id') or '')
            if not ext_comment_id or ext_comment_id in existing_comments:
                continue
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
                    (local_id, comment_user, text or '(вложение)', is_internal, c_created, ext_comment_id)
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

    # === Новые вложения самой заявки ===
    with conn.cursor() as cur:
        cur.execute(
            "SELECT external_id FROM ticket_attachments WHERE ticket_id=%s AND external_source='vsdesk' AND external_id IS NOT NULL",
            (local_id,)
        )
        existing_atts = {r['external_id'] for r in cur.fetchall()}

    for f in (req.get('files') or []):
        try:
            ext_att_id = str(f.get('id') or '')
            if ext_att_id and ext_att_id in existing_atts:
                continue
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
                    (local_id, fname, final_url, fsize, author_user or system_user_id, ext_att_id or None)
                )
            counters['attachments'] += 1
        except Exception:
            continue

    # === Новые наблюдатели ===
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
                    if cur.rowcount:
                        counters['watchers'] += 1
        except Exception:
            continue

    # === Новые события истории ===
    with conn.cursor() as cur:
        cur.execute(
            "SELECT external_id FROM ticket_history WHERE ticket_id=%s AND external_source='vsdesk' AND external_id IS NOT NULL",
            (local_id,)
        )
        existing_hist = {r['external_id'] for r in cur.fetchall()}

    history = req.get('history') or req.get('log') or []
    for h in history:
        try:
            ext_h_id = str(h.get('id') or '')
            if ext_h_id and ext_h_id in existing_hist:
                continue
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
                     str(new_v) if new_v else None, h_ts, ext_h_id or None)
                )
            counters['history'] += 1
        except Exception:
            continue

    # === Кастомные поля (перезапись значений) ===
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
                # Перезаписываем: удаляем старое значение этого поля и вставляем новое
                cur.execute(
                    "DELETE FROM ticket_custom_field_values WHERE ticket_id=%s AND field_id=%s AND external_source='vsdesk'",
                    (local_id, field_id)
                )
                cur.execute(
                    """INSERT INTO ticket_custom_field_values (ticket_id, field_id, value, external_source)
                       VALUES (%s, %s, %s, 'vsdesk')""",
                    (local_id, field_id, '' if value is None else str(value))
                )
            counters['custom_fields'] += 1
        except Exception:
            continue

    conn.commit()
    return {'status': 'updated', 'local_id': local_id, 'counters': counters}


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


def action_bump_sequence(conn) -> dict:
    """Двигает tickets_id_seq выше максимального vsDesk id, чтобы новые заявки не конфликтовали."""
    try:
        all_req = vsdesk_list('/api/requests/')
    except Exception as e:
        return {'success': False, 'error': f'vsdesk_unreachable: {e}'}

    max_vsdesk = 0
    for r in all_req:
        try:
            v = int(r.get('id') or 0)
            if v > max_vsdesk:
                max_vsdesk = v
        except Exception:
            continue

    with conn.cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(id), 0) AS m FROM tickets")
        max_local = cur.fetchone()['m'] or 0
        # sequence имя
        cur.execute("SELECT pg_get_serial_sequence('tickets', 'id') AS seq")
        seq_name = cur.fetchone()['seq']
        target = max(max_local, max_vsdesk) + 1
        # setval устанавливает текущее значение; следующий nextval = target + 1, поэтому даём target-1
        cur.execute(f"SELECT setval('{seq_name}', %s, true)", (max(target - 1, 1),))
    conn.commit()
    return {
        'success': True,
        'max_vsdesk_id': max_vsdesk,
        'max_local_id': max_local,
        'next_id_will_be': target,
    }


def action_purge(conn) -> dict:
    """Удаляет все заявки vsDesk и связанные данные. Файлы в S3 удаляет по возможности."""
    s3 = get_s3_client()
    deleted_files_s3 = 0
    cdn_prefix = f'{CDN_BASE}/' if CDN_BASE else ''

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM tickets WHERE external_source='vsdesk' AND external_id IS NOT NULL"
        )
        ticket_ids = [row['id'] for row in cur.fetchall()]

        counts = {
            'tickets': len(ticket_ids),
            'comments': 0,
            'comment_attachments': 0,
            'ticket_attachments': 0,
            'history': 0,
            'watchers': 0,
            'custom_field_values': 0,
            's3_files_deleted': 0,
        }

        if not ticket_ids:
            return {'success': True, **counts}

        # Соберём S3-ключи перед удалением записей
        s3_keys: List[str] = []
        cur.execute(
            "SELECT url FROM ticket_attachments WHERE external_source='vsdesk' AND ticket_id = ANY(%s)",
            (ticket_ids,)
        )
        for row in cur.fetchall():
            url = row['url'] or ''
            if cdn_prefix and url.startswith(cdn_prefix):
                s3_keys.append(url[len(cdn_prefix):])

        cur.execute(
            """SELECT ca.url FROM comment_attachments ca
               JOIN ticket_comments tc ON tc.id = ca.comment_id
               WHERE tc.ticket_id = ANY(%s) AND ca.external_source='vsdesk'""",
            (ticket_ids,)
        )
        for row in cur.fetchall():
            url = row['url'] or ''
            if cdn_prefix and url.startswith(cdn_prefix):
                s3_keys.append(url[len(cdn_prefix):])

        # Удаляем связанные сущности
        cur.execute(
            """DELETE FROM comment_attachments
               WHERE comment_id IN (SELECT id FROM ticket_comments WHERE ticket_id = ANY(%s))""",
            (ticket_ids,)
        )
        counts['comment_attachments'] = cur.rowcount or 0

        cur.execute("DELETE FROM ticket_comments WHERE ticket_id = ANY(%s)", (ticket_ids,))
        counts['comments'] = cur.rowcount or 0

        cur.execute(
            "DELETE FROM ticket_attachments WHERE ticket_id = ANY(%s) AND external_source='vsdesk'",
            (ticket_ids,)
        )
        counts['ticket_attachments'] = cur.rowcount or 0

        cur.execute("DELETE FROM ticket_history WHERE ticket_id = ANY(%s)", (ticket_ids,))
        counts['history'] = cur.rowcount or 0

        cur.execute("DELETE FROM ticket_watchers WHERE ticket_id = ANY(%s)", (ticket_ids,))
        counts['watchers'] = cur.rowcount or 0

        cur.execute("DELETE FROM ticket_custom_field_values WHERE ticket_id = ANY(%s)", (ticket_ids,))
        counts['custom_field_values'] = cur.rowcount or 0

        cur.execute(
            "DELETE FROM tickets WHERE id = ANY(%s) AND external_source='vsdesk'",
            (ticket_ids,)
        )
        counts['tickets'] = cur.rowcount or 0

    conn.commit()

    # Чистим S3 — best-effort
    if s3 and s3_keys:
        for key in s3_keys:
            try:
                s3.delete_object(Bucket=S3_BUCKET, Key=key)
                deleted_files_s3 += 1
            except Exception:
                continue
    counts['s3_files_deleted'] = deleted_files_s3

    return {'success': True, **counts}


# =====================================================================
# Фоновая задача (Job)
# =====================================================================

JOB_TICK_BATCH = 10
JOB_LOCK_TIMEOUT_SECONDS = 180  # если воркер завис — лок снимется через 3 мин


def get_active_job(conn) -> Optional[dict]:
    """Активная фоновая задача (не inline — inline обслуживается фронтом отдельно)."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM vsdesk_sync_jobs WHERE status='running' AND job_type <> 'inline' ORDER BY id DESC LIMIT 1"
        )
        return cur.fetchone()


def collect_imported_ext_ids(conn) -> List[str]:
    """Возвращает ext_id всех уже импортированных vsDesk-заявок (для delta-sync)."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT external_id FROM tickets WHERE external_source='vsdesk' AND external_id IS NOT NULL"
        )
        return [row['external_id'] for row in cur.fetchall()]


def action_start_delta_job(conn) -> dict:
    """Создаёт фоновую задачу обновления уже импортированных заявок."""
    existing = get_active_job(conn)
    if existing:
        return {'success': True, 'job_id': existing['id'], 'already_running': True}

    ids = collect_imported_ext_ids(conn)
    if not ids:
        return {'success': False, 'error': 'Нет импортированных заявок vsDesk для обновления.'}

    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO vsdesk_sync_jobs
               (status, job_type, queue, total, processed, inserted, skipped, filtered, errors, error_details, started_at)
               VALUES ('running', 'delta', %s::jsonb, %s, 0, 0, 0, 0, 0, '[]'::jsonb, CURRENT_TIMESTAMP)
               RETURNING id""",
            (json.dumps(ids), len(ids))
        )
        job_id = cur.fetchone()['id']
    conn.commit()
    return {'success': True, 'job_id': job_id, 'total': len(ids)}


def action_start_job(conn) -> dict:
    existing = get_active_job(conn)
    if existing:
        return {'success': True, 'job_id': existing['id'], 'already_running': True}

    ids = collect_eligible_ext_ids(conn)
    if not ids:
        return {'success': False, 'error': 'Нет заявок для синхронизации. Отметьте статусы и сохраните настройки.'}

    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO vsdesk_sync_jobs
               (status, queue, total, processed, inserted, skipped, filtered, errors, error_details, started_at)
               VALUES ('running', %s::jsonb, %s, 0, 0, 0, 0, 0, '[]'::jsonb, CURRENT_TIMESTAMP)
               RETURNING id""",
            (json.dumps(ids), len(ids))
        )
        job_id = cur.fetchone()['id']
    conn.commit()
    return {'success': True, 'job_id': job_id, 'total': len(ids)}


def action_job_status(conn) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """SELECT id, status, total, processed, inserted, skipped, filtered, errors,
                      error_details, last_error, started_at, last_tick_at, finished_at
               FROM vsdesk_sync_jobs ORDER BY id DESC LIMIT 1"""
        )
        row = cur.fetchone()
    if not row:
        return {'job': None}
    return {'job': dict(row)}


def action_cancel_job(conn) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE vsdesk_sync_jobs SET status='cancelled', finished_at=CURRENT_TIMESTAMP
               WHERE status='running' RETURNING id"""
        )
        row = cur.fetchone()
    conn.commit()
    return {'success': True, 'cancelled_job_id': row['id'] if row else None}


def action_tick(conn) -> dict:
    """Вызывается cron'ом каждую минуту. Обрабатывает 1 пачку у активной задачи."""
    # Снимаем зависшие локи
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE vsdesk_sync_jobs
               SET is_locked = FALSE
               WHERE is_locked = TRUE
                 AND locked_at < CURRENT_TIMESTAMP - INTERVAL '%s seconds'""",
            (JOB_LOCK_TIMEOUT_SECONDS,)
        )
        # Берём активную задачу с локом (inline-job обрабатывает фронт, tick их не трогает)
        cur.execute(
            """UPDATE vsdesk_sync_jobs
               SET is_locked = TRUE, locked_at = CURRENT_TIMESTAMP
               WHERE id = (
                   SELECT id FROM vsdesk_sync_jobs
                   WHERE status='running' AND is_locked=FALSE AND job_type <> 'inline'
                   ORDER BY id ASC LIMIT 1
               )
               RETURNING *"""
        )
        job = cur.fetchone()
    conn.commit()

    if not job:
        return {'success': True, 'idle': True}

    job_id = job['id']
    queue = job['queue'] or []
    if not isinstance(queue, list):
        queue = []

    batch = queue[:JOB_TICK_BATCH]
    rest = queue[JOB_TICK_BATCH:]

    mapping = load_status_mapping(conn)
    default_status = get_default_status_id(conn)
    sys_user = get_system_user_id(conn)

    stats = {'inserted': 0, 'skipped': 0, 'filtered': 0, 'errors': 0}
    new_errors: List[dict] = []

    job_type = job.get('job_type') or 'import'

    for ext in batch:
        try:
            if job_type == 'delta':
                res = update_one_ticket(conn, ext, mapping, default_status, sys_user)
                # для delta: 'updated' считаем как 'inserted' (т.е. успешно обработано)
                status = res.get('status')
                if status == 'updated':
                    stats['inserted'] += 1
                elif status in ('skipped', 'filtered'):
                    stats[status] += 1
                else:
                    stats['errors'] += 1
                    new_errors.append({'ext_id': ext, 'reason': res.get('reason') or 'unknown'})
            else:
                res = import_one_ticket(conn, ext, mapping, default_status, sys_user)
                key = res['status'] if res['status'] in ('inserted', 'skipped', 'filtered') else 'errors'
                stats[key] += 1
                if res.get('status') == 'error':
                    new_errors.append({'ext_id': ext, 'reason': res.get('reason') or 'unknown'})
        except Exception as e:
            stats['errors'] += 1
            new_errors.append({'ext_id': ext, 'reason': f'exception: {e}'})

    existing_errors = job.get('error_details') or []
    if not isinstance(existing_errors, list):
        existing_errors = []
    existing_errors.extend(new_errors)
    # обрезаем чтобы не разрасталось
    if len(existing_errors) > 500:
        existing_errors = existing_errors[-500:]

    done = len(rest) == 0
    new_status = 'done' if done else 'running'

    with conn.cursor() as cur:
        cur.execute(
            """UPDATE vsdesk_sync_jobs
               SET queue = %s::jsonb,
                   processed = processed + %s,
                   inserted = inserted + %s,
                   skipped = skipped + %s,
                   filtered = filtered + %s,
                   errors = errors + %s,
                   error_details = %s::jsonb,
                   status = %s,
                   last_tick_at = CURRENT_TIMESTAMP,
                   finished_at = CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE finished_at END,
                   is_locked = FALSE
               WHERE id = %s""",
            (json.dumps(rest), len(batch),
             stats['inserted'], stats['skipped'], stats['filtered'], stats['errors'],
             json.dumps(existing_errors), new_status, done, job_id)
        )
    conn.commit()

    return {
        'success': True,
        'job_id': job_id,
        'processed_in_tick': len(batch),
        'remaining': len(rest),
        'done': done,
        **stats,
    }


def action_delta_batch(conn, offset: int, limit: int) -> dict:
    ids = collect_imported_ext_ids(conn)
    total = len(ids)
    batch = ids[offset:offset + limit]
    mapping = load_status_mapping(conn)
    default_status = get_default_status_id(conn)
    sys_user = get_system_user_id(conn)
    stats = {'inserted': 0, 'skipped': 0, 'filtered': 0, 'errors': 0, 'details': []}
    for ext in batch:
        res = update_one_ticket(conn, ext, mapping, default_status, sys_user)
        status = res.get('status')
        if status == 'updated':
            stats['inserted'] += 1
        elif status in ('skipped', 'filtered'):
            stats[status] += 1
        else:
            stats['errors'] += 1
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


def _get_or_create_inline_job(conn, force_rebuild: bool = False) -> Optional[dict]:
    """Возвращает активный inline-job. Если его нет — строит очередь из vsDesk один раз и создаёт job.
    Возвращает None если vsDesk недоступен или нечего импортировать."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM vsdesk_sync_jobs WHERE status='running' AND job_type='inline' ORDER BY id DESC LIMIT 1"
        )
        existing = cur.fetchone()

    if existing and not force_rebuild:
        return dict(existing)

    # Строим очередь — один тяжёлый запрос к vsDesk
    try:
        ids = collect_eligible_ext_ids(conn)
    except Exception as e:
        return {'__error__': f'vsdesk_unreachable: {e}'}

    if not ids:
        return None

    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO vsdesk_sync_jobs
               (status, job_type, queue, total, processed, inserted, skipped, filtered, errors, error_details, started_at)
               VALUES ('running', 'inline', %s::jsonb, %s, 0, 0, 0, 0, 0, '[]'::jsonb, CURRENT_TIMESTAMP)
               RETURNING *""",
            (json.dumps(ids), len(ids))
        )
        job = cur.fetchone()
    conn.commit()
    return dict(job)


def action_sync_batch(conn, offset: int, limit: int) -> dict:
    """Импортирует пачку заявок vsDesk, используя кэшированную очередь в БД (job_type='inline').
    Параметр offset игнорируется (оставлен для совместимости фронта) — очередь сохраняется на сервере.
    Каждый вызов забирает первые `limit` ext_id из очереди, импортирует и удаляет из очереди.
    """
    # Если offset=0 и есть незавершённый inline-job — продолжаем с него.
    # Если очереди нет — строим её один раз.
    job_info = _get_or_create_inline_job(conn, force_rebuild=False)

    if job_info is None:
        return {
            'success': True,
            'total': 0,
            'processed': 0,
            'next_offset': 0,
            'done': True,
            'batch_size': 0,
            'inserted': 0,
            'skipped': 0,
            'filtered': 0,
            'errors': 0,
            'details': [],
        }
    if isinstance(job_info, dict) and job_info.get('__error__'):
        return {'success': False, 'error': job_info['__error__']}

    job_id = job_info['id']
    queue = job_info.get('queue') or []
    if not isinstance(queue, list):
        queue = []
    total = int(job_info.get('total') or len(queue) + int(job_info.get('processed') or 0))
    already_processed = int(job_info.get('processed') or 0)

    if limit <= 0 or limit > 100:
        limit = 10
    batch = queue[:limit]
    rest = queue[limit:]

    mapping = load_status_mapping(conn)
    default_status = get_default_status_id(conn)
    sys_user = get_system_user_id(conn)
    stats = {'inserted': 0, 'skipped': 0, 'filtered': 0, 'errors': 0, 'details': []}

    for ext in batch:
        try:
            res = import_one_ticket(conn, ext, mapping, default_status, sys_user)
            key = res['status'] if res['status'] in ('inserted', 'skipped', 'filtered') else 'errors'
            stats[key] += 1
            if res.get('status') == 'error':
                stats['details'].append({'ext_id': ext, 'reason': res.get('reason')})
        except Exception as e:
            stats['errors'] += 1
            stats['details'].append({'ext_id': ext, 'reason': f'exception: {e}'})

    new_processed = already_processed + len(batch)
    done = len(rest) == 0
    new_status = 'done' if done else 'running'

    existing_errors = job_info.get('error_details') or []
    if not isinstance(existing_errors, list):
        existing_errors = []
    existing_errors.extend(stats['details'])
    if len(existing_errors) > 500:
        existing_errors = existing_errors[-500:]

    with conn.cursor() as cur:
        cur.execute(
            """UPDATE vsdesk_sync_jobs
               SET queue = %s::jsonb,
                   processed = %s,
                   inserted = inserted + %s,
                   skipped = skipped + %s,
                   filtered = filtered + %s,
                   errors = errors + %s,
                   error_details = %s::jsonb,
                   status = %s,
                   last_tick_at = CURRENT_TIMESTAMP,
                   finished_at = CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE finished_at END
               WHERE id = %s""",
            (json.dumps(rest), new_processed,
             stats['inserted'], stats['skipped'], stats['filtered'], stats['errors'],
             json.dumps(existing_errors), new_status, done, job_id)
        )
    conn.commit()

    return {
        'success': True,
        'total': total,
        'processed': new_processed,
        'next_offset': new_processed,
        'done': done,
        'batch_size': len(batch),
        'job_id': job_id,
        **{k: v for k, v in stats.items()},
    }


# =====================================================================
# Перепривязка импортированных заявок (vsDesk-import → реальные юзеры)
# =====================================================================

def _get_import_user_id(conn) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM users WHERE external_source='vsdesk' AND external_id='system' LIMIT 1"
        )
        row = cur.fetchone()
        return row['id'] if row else None


def action_remap_count(conn) -> dict:
    """Сколько заявок ещё нужно перепривязать с технического юзера."""
    import_uid = _get_import_user_id(conn)
    if not import_uid:
        return {'pending': 0, 'tickets': 0, 'comments': 0, 'watchers': 0, 'history': 0}
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS c FROM tickets WHERE external_source='vsdesk' AND (created_by = %s OR assigned_to = %s)",
            (import_uid, import_uid)
        )
        tickets_left = cur.fetchone()['c'] or 0
        cur.execute("SELECT COUNT(*) AS c FROM ticket_watchers WHERE user_id = %s", (import_uid,))
        watchers_left = cur.fetchone()['c'] or 0
        cur.execute("SELECT COUNT(*) AS c FROM ticket_comments WHERE user_id = %s", (import_uid,))
        comments_left = cur.fetchone()['c'] or 0
        cur.execute("SELECT COUNT(*) AS c FROM ticket_history WHERE user_id = %s", (import_uid,))
        history_left = cur.fetchone()['c'] or 0
    return {
        'pending': tickets_left,
        'tickets': tickets_left,
        'comments': comments_left,
        'watchers': watchers_left,
        'history': history_left,
    }


def remap_one_ticket(conn, ticket_local_id: int, ext_id: str, import_uid: int) -> dict:
    """Подтягивает заявку из vsDesk и переставляет ссылки на реальных юзеров.
    Обновляет: created_by, assigned_to, watchers, авторов комментариев и истории."""
    counters = {'updated': 0, 'comments_fixed': 0, 'watchers_fixed': 0, 'history_fixed': 0}
    try:
        req = vsdesk_raw(f'/api/requests/{ext_id}/')
    except Exception as e:
        return {'status': 'error', 'reason': f'fetch_failed: {e}', **counters}
    if not isinstance(req, dict):
        return {'status': 'error', 'reason': 'invalid_response', **counters}

    # Автор
    author_email = req.get('UserEmail') or req.get('AuthorEmail') or ''
    author_name = req.get('UserName') or req.get('Author') or req.get('FIO') or ''
    author_vid = str(req.get('user_id') or req.get('UserId') or '')
    new_author = find_or_create_user(conn, author_email, author_name, author_vid)

    # Исполнитель
    exec_email = req.get('ExecutorEmail') or req.get('ExpertEmail') or ''
    exec_name = req.get('Executor') or req.get('Expert') or ''
    exec_vid = str(req.get('executor_id') or req.get('expert_id') or '')
    new_executor = None
    if exec_name or exec_email or exec_vid:
        new_executor = find_or_create_user(conn, exec_email, exec_name, exec_vid)

    with conn.cursor() as cur:
        if new_author and new_author != import_uid:
            cur.execute(
                "UPDATE tickets SET created_by = %s WHERE id = %s AND created_by = %s",
                (new_author, ticket_local_id, import_uid)
            )
            if cur.rowcount:
                counters['updated'] += 1
        if new_executor and new_executor != import_uid:
            cur.execute(
                "UPDATE tickets SET assigned_to = %s WHERE id = %s AND (assigned_to = %s OR assigned_to IS NULL)",
                (new_executor, ticket_local_id, import_uid)
            )
            if cur.rowcount:
                counters['updated'] += 1

    # Наблюдатели
    watchers = req.get('watchers') or req.get('observers') or []
    for w in watchers:
        w_email = w.get('email') if isinstance(w, dict) else ''
        w_name = (w.get('name') or w.get('full_name') or '') if isinstance(w, dict) else str(w)
        w_id = str(w.get('id') or '') if isinstance(w, dict) else ''
        new_w = find_or_create_user(conn, w_email, w_name, w_id)
        if not new_w or new_w == import_uid:
            continue
        with conn.cursor() as cur:
            # Снять с import_uid → переставить
            cur.execute(
                "UPDATE ticket_watchers SET user_id = %s WHERE ticket_id = %s AND user_id = %s "
                "AND NOT EXISTS (SELECT 1 FROM ticket_watchers tw2 WHERE tw2.ticket_id = %s AND tw2.user_id = %s)",
                (new_w, ticket_local_id, import_uid, ticket_local_id, new_w)
            )
            if cur.rowcount:
                counters['watchers_fixed'] += 1
            else:
                # Если такой watcher уже есть → просто удаляем строку с import_uid
                cur.execute(
                    "DELETE FROM ticket_watchers WHERE ticket_id = %s AND user_id = %s",
                    (ticket_local_id, import_uid)
                )

    # Комментарии (по external_id)
    subs = req.get('subs') or []
    for c in subs:
        if not isinstance(c, dict):
            continue
        ext_c = str(c.get('id') or '')
        if not ext_c:
            continue
        c_email = c.get('UserEmail') or ''
        c_name = c.get('UserName') or c.get('Author') or ''
        c_vid = str(c.get('user_id') or '')
        new_c = find_or_create_user(conn, c_email, c_name, c_vid)
        if not new_c or new_c == import_uid:
            continue
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ticket_comments SET user_id = %s "
                "WHERE ticket_id = %s AND external_source='vsdesk' AND external_id = %s AND user_id = %s",
                (new_c, ticket_local_id, ext_c, import_uid)
            )
            if cur.rowcount:
                counters['comments_fixed'] += 1

    # История
    history = req.get('history') or req.get('log') or []
    for h in history:
        if not isinstance(h, dict):
            continue
        ext_h = str(h.get('id') or '')
        if not ext_h:
            continue
        h_email = h.get('UserEmail') or ''
        h_name = h.get('UserName') or h.get('user') or ''
        h_vid = str(h.get('user_id') or '')
        new_h = find_or_create_user(conn, h_email, h_name, h_vid)
        if not new_h or new_h == import_uid:
            continue
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ticket_history SET user_id = %s "
                "WHERE ticket_id = %s AND external_source='vsdesk' AND external_id = %s AND user_id = %s",
                (new_h, ticket_local_id, ext_h, import_uid)
            )
            if cur.rowcount:
                counters['history_fixed'] += 1

    conn.commit()
    return {'status': 'ok', **counters}


def action_remap_batch(conn, limit: int = 5) -> dict:
    """Берёт следующую пачку vsDesk-заявок, привязанных к техническому юзеру, и перепривязывает их.
    Также включает заявки, где импорт-юзер только в наблюдателях/комментариях."""
    import_uid = _get_import_user_id(conn)
    if not import_uid:
        return {'success': True, 'done': True, 'reason': 'no_import_user'}
    if limit <= 0 or limit > 30:
        limit = 5

    with conn.cursor() as cur:
        # Берём заявки, где import_uid в created_by/assigned_to ИЛИ в комментариях/наблюдателях/истории.
        cur.execute(
            """
            SELECT DISTINCT t.id, t.external_id FROM tickets t
            WHERE t.external_source = 'vsdesk' AND t.external_id IS NOT NULL
              AND (
                t.created_by = %s OR t.assigned_to = %s
                OR EXISTS (SELECT 1 FROM ticket_comments c WHERE c.ticket_id = t.id AND c.user_id = %s)
                OR EXISTS (SELECT 1 FROM ticket_watchers w WHERE w.ticket_id = t.id AND w.user_id = %s)
                OR EXISTS (SELECT 1 FROM ticket_history h WHERE h.ticket_id = t.id AND h.user_id = %s)
              )
            ORDER BY t.id ASC
            LIMIT %s
            """,
            (import_uid, import_uid, import_uid, import_uid, import_uid, limit)
        )
        rows = cur.fetchall()

    if not rows:
        return {'success': True, 'done': True, 'processed': 0}

    totals = {'processed': 0, 'updated': 0, 'comments_fixed': 0, 'watchers_fixed': 0, 'history_fixed': 0, 'errors': 0}
    details: List[dict] = []
    for r in rows:
        try:
            res = remap_one_ticket(conn, r['id'], r['external_id'], import_uid)
            totals['processed'] += 1
            if res.get('status') == 'ok':
                totals['updated'] += res.get('updated', 0)
                totals['comments_fixed'] += res.get('comments_fixed', 0)
                totals['watchers_fixed'] += res.get('watchers_fixed', 0)
                totals['history_fixed'] += res.get('history_fixed', 0)
            else:
                totals['errors'] += 1
                details.append({'ticket_id': r['id'], 'ext_id': r['external_id'], 'reason': res.get('reason')})
        except Exception as e:
            totals['errors'] += 1
            details.append({'ticket_id': r['id'], 'ext_id': r['external_id'], 'reason': f'exception: {e}'})

    # После пачки — пересчитываем "осталось"
    remain = action_remap_count(conn)
    return {
        'success': True,
        'done': remain.get('pending', 0) == 0 and remain.get('comments', 0) == 0
                 and remain.get('watchers', 0) == 0 and remain.get('history', 0) == 0,
        'remaining': remain,
        'details': details,
        **totals,
    }


def action_probe(ext_id: str) -> dict:
    """Возвращает сырой JSON заявки vsDesk + анализ всех ключей,
    где может лежать имя/email автора и комментаторов. Нужен для диагностики."""
    ext_id = (ext_id or '').strip()
    if not ext_id:
        return {'error': 'Передай параметр id (внешний id заявки vsDesk)'}
    try:
        raw = vsdesk_raw(f'/api/requests/{ext_id}/')
    except Exception as e:
        return {'error': f'vsdesk_unreachable: {e}'}

    def summarize(d):
        out = {}
        if isinstance(d, dict):
            for k, v in d.items():
                if isinstance(v, dict):
                    out[k] = {'__type__': 'dict', '__len__': len(v), '__keys__': list(v.keys())[:30]}
                elif isinstance(v, list):
                    sample_keys = []
                    if v and isinstance(v[0], dict):
                        sample_keys = list(v[0].keys())[:30]
                    out[k] = {'__type__': 'list', '__len__': len(v), '__first_keys__': sample_keys}
                else:
                    out[k] = v
        return out

    top = summarize(raw) if isinstance(raw, dict) else {}

    subs = raw.get('subs') if isinstance(raw, dict) else None
    first_sub = summarize(subs[0]) if isinstance(subs, list) and subs and isinstance(subs[0], dict) else {}

    history = raw.get('history') if isinstance(raw, dict) else None
    first_history = summarize(history[0]) if isinstance(history, list) and history and isinstance(history[0], dict) else {}

    watchers = raw.get('watchers') if isinstance(raw, dict) else None
    first_watcher = summarize(watchers[0]) if isinstance(watchers, list) and watchers and isinstance(watchers[0], dict) else {}

    return {
        'ext_id': ext_id,
        'top_level': top,
        'subs_count': len(subs) if isinstance(subs, list) else 0,
        'first_sub': first_sub,
        'history_count': len(history) if isinstance(history, list) else 0,
        'first_history': first_history,
        'watchers_count': len(watchers) if isinstance(watchers, list) else 0,
        'first_watcher': first_watcher,
        'raw': raw,
    }


def action_enable_login_for_imported(conn) -> dict:
    """Включает can_login для всех импортированных vsDesk-юзеров (кроме технического)."""
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE users SET can_login = TRUE, updated_at = CURRENT_TIMESTAMP
               WHERE external_source = 'vsdesk'
                 AND COALESCE(external_id, '') <> 'system'
                 AND can_login = FALSE
               RETURNING id"""
        )
        ids = [row['id'] for row in cur.fetchall()]
    conn.commit()
    return {'success': True, 'updated_users': len(ids)}


# =====================================================================
# Глобальная пауза
# =====================================================================

def is_paused(conn) -> dict:
    """Возвращает {'paused': bool, 'reason': str|None, 'paused_at': str|None}."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT paused, paused_reason, paused_at FROM vsdesk_settings WHERE id = 1 LIMIT 1"
            )
            row = cur.fetchone()
    except Exception:
        return {'paused': False, 'reason': None, 'paused_at': None}
    if not row:
        return {'paused': False, 'reason': None, 'paused_at': None}
    return {
        'paused': bool(row.get('paused')),
        'reason': row.get('paused_reason'),
        'paused_at': str(row.get('paused_at')) if row.get('paused_at') else None,
    }


def paused_response() -> dict:
    return {
        'success': False,
        'paused': True,
        'error': 'vsDesk-синхронизация на паузе. Включите её в настройках интеграции.',
        'idle': True,
    }


def action_get_pause(conn) -> dict:
    return is_paused(conn)


def action_set_pause(conn, body: dict) -> dict:
    paused = bool(body.get('paused'))
    reason = (body.get('reason') or '').strip() or None
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO vsdesk_settings (id, paused, paused_reason, paused_at, updated_at)
               VALUES (1, %s, %s, CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
               ON CONFLICT (id) DO UPDATE
               SET paused = EXCLUDED.paused,
                   paused_reason = EXCLUDED.paused_reason,
                   paused_at = CASE WHEN EXCLUDED.paused THEN CURRENT_TIMESTAMP ELSE NULL END,
                   updated_at = CURRENT_TIMESTAMP""",
            (paused, reason, paused)
        )
    conn.commit()
    return {'success': True, **is_paused(conn)}


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
        # Pause control — отдельные действия, всегда доступны
        if action == 'get_pause' and method == 'GET':
            return api_response(200, action_get_pause(conn))

        if action == 'set_pause' and method == 'POST':
            return api_response(200, action_set_pause(conn, body))

        # Тяжёлые действия — блокируем при глобальной паузе
        HEAVY_ACTIONS = {
            'tick', 'start_job', 'start_delta_job', 'delta_sync',
            'sync', '', 'remap_batch', 'dry_run', 'count', 'statuses',
            'bump_sequence',
        }
        if action in HEAVY_ACTIONS:
            pause_state = is_paused(conn)
            if pause_state.get('paused'):
                return api_response(200, {**paused_response(), **pause_state})

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

        if action == 'purge' and method in ('POST', 'DELETE'):
            return api_response(200, action_purge(conn))

        if action == 'bump_sequence' and method == 'POST':
            return api_response(200, action_bump_sequence(conn))

        if action == 'start_job' and method == 'POST':
            return api_response(200, action_start_job(conn))

        if action == 'start_delta_job' and method == 'POST':
            return api_response(200, action_start_delta_job(conn))

        if action == 'delta_sync' and method in ('POST', 'GET'):
            try:
                offset = int(body.get('offset') if 'offset' in body else params.get('offset', 0))
            except Exception:
                offset = 0
            try:
                limit = int(body.get('limit') if 'limit' in body else params.get('limit', 10))
            except Exception:
                limit = 10
            if limit <= 0 or limit > 100:
                limit = 10
            return api_response(200, action_delta_batch(conn, offset, limit))

        if action == 'job_status' and method == 'GET':
            return api_response(200, action_job_status(conn))

        if action == 'cancel_job' and method == 'POST':
            return api_response(200, action_cancel_job(conn))

        if action == 'tick' and method in ('POST', 'GET'):
            return api_response(200, action_tick(conn))

        if action == 'reset_inline_job' and method == 'POST':
            with conn.cursor() as cur:
                cur.execute(
                    """UPDATE vsdesk_sync_jobs SET status='cancelled', finished_at=CURRENT_TIMESTAMP
                       WHERE status='running' AND job_type='inline' RETURNING id"""
                )
                row = cur.fetchone()
            conn.commit()
            return api_response(200, {'success': True, 'cancelled_job_id': row['id'] if row else None})

        if action == 'probe' and method == 'GET':
            return api_response(200, action_probe(params.get('id', '')))

        if action == 'remap_count' and method == 'GET':
            return api_response(200, action_remap_count(conn))

        if action == 'remap_batch' and method in ('POST', 'GET'):
            try:
                limit = int(body.get('limit') if 'limit' in body else params.get('limit', 5))
            except Exception:
                limit = 5
            return api_response(200, action_remap_batch(conn, limit))

        if action == 'enable_login_imported' and method == 'POST':
            return api_response(200, action_enable_login_for_imported(conn))

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