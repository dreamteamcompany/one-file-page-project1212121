"""
Синхронизация заявок и комментариев из vsDesk в локальную базу данных.
Заявки: только со статусом «Открыта». Комментарии: все к синхронизированным заявкам.
"""
import json
import os
import re
import base64
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL')
SCHEMA = os.environ.get('MAIN_DB_SCHEMA')
VSDESK_URL = 'https://help.dreamteamcompany.ru'
VSDESK_LOGIN = os.environ.get('VSDESK_LOGIN')
VSDESK_PASSWORD = os.environ.get('VSDESK_PASSWORD')

OPEN_STATUS_VALUES = {'открыта', 'open', 'new', 'новая'}


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id',
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
    """GET-запрос к vsDesk API, возвращает сырой ответ"""
    url = f'{VSDESK_URL}{path}'
    req = urllib.request.Request(url, headers={
        'Authorization': basic_auth_header(),
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode('utf-8-sig'))


def vsdesk_get(path: str) -> list:
    """GET-запрос к vsDesk API с Basic Auth, возвращает список"""
    data = vsdesk_raw(path)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get('comments') or data.get('requests') or data.get('data') or data.get('items') or []
    return []


def map_priority(priority_str: str) -> int:
    mapping = {
        'низкий': 5, 'low': 5,
        'средний': 2, 'normal': 2, 'medium': 2,
        'высокий': 3, 'high': 3,
        'критический': 4, 'critical': 4, 'urgent': 4,
    }
    return mapping.get((priority_str or '').lower().strip(), 2)


def get_last_sync_time(conn):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT MAX(created_at) FROM tickets WHERE external_source = 'vsdesk'"
        )
        row = cur.fetchone()
        if row and row['max']:
            dt = row['max']
            if hasattr(dt, 'strftime'):
                return dt.strftime('%Y-%m-%d %H:%M:%S')
    return None


def sync_tickets(requests_list: list, conn, since_dt=None) -> dict:
    """Фильтрует по статусу «Открыта» и дате, сохраняет новые заявки. Возвращает маппинг ext_id -> ticket_id."""
    inserted = 0
    skipped = 0
    filtered_out = 0
    ext_to_local = {}

    with conn.cursor() as cur:
        # Загружаем уже существующие маппинги vsdesk -> local
        cur.execute("SELECT id, external_id FROM tickets WHERE external_source = 'vsdesk' AND external_id IS NOT NULL")
        for row in cur.fetchall():
            ext_to_local[row['external_id']] = row['id']

        for req in requests_list:
            status_raw = (req.get('Status') or '').strip()
            closed_val = str(req.get('closed') or '').strip()

            is_open = status_raw.lower() in OPEN_STATUS_VALUES or closed_val == '1'
            if not is_open:
                filtered_out += 1
                continue

            ts = req.get('timestamp') or ''
            if since_dt and ts and ts <= since_dt:
                filtered_out += 1
                continue

            ext_id = str(req.get('id') or '')
            if not ext_id:
                continue

            if ext_id in ext_to_local:
                skipped += 1
                continue

            title = (req.get('Name') or 'Без темы')[:500]
            description = strip_html(req.get('Content') or '')
            due_date = req.get('timestampEnd') or None
            created_at = req.get('timestamp') or None
            priority_id = map_priority(req.get('Priority') or '')

            cur.execute(
                '''INSERT INTO tickets
                   (title, description, status_id, priority_id, created_by,
                    due_date, created_at, external_id, external_source)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'vsdesk')
                   RETURNING id''',
                (title, description, 1, priority_id, 1, due_date, created_at, ext_id)
            )
            local_id = cur.fetchone()['id']
            ext_to_local[ext_id] = local_id
            inserted += 1

    conn.commit()
    return {
        'inserted': inserted,
        'skipped': skipped,
        'filtered_out': filtered_out,
        'ext_to_local': ext_to_local,
    }


def sync_comments(ext_to_local: dict, conn) -> dict:
    """Синхронизирует комментарии (subs) через детальный запрос /api/requests/{id}/ для последних 30 заявок"""
    inserted = 0
    skipped = 0
    errors = 0

    if not ext_to_local:
        return {'inserted': 0, 'skipped': 0, 'errors': 0}

    # Берём последние 30 заявок по убыванию ID
    sorted_ext_ids = sorted(ext_to_local.keys(), key=lambda x: int(x) if x.isdigit() else 0, reverse=True)
    recent_ext_ids = sorted_ext_ids[:30]

    with conn.cursor() as cur:
        cur.execute(
            "SELECT external_id FROM ticket_comments WHERE external_source = 'vsdesk' AND external_id IS NOT NULL"
        )
        existing_ext_ids = {row['external_id'] for row in cur.fetchall()}

        for ext_ticket_id in recent_ext_ids:
            local_ticket_id = ext_to_local[ext_ticket_id]

            try:
                detail = vsdesk_raw(f'/api/requests/{ext_ticket_id}/')
            except Exception as e:
                errors += 1
                continue

            subs = detail.get('subs') or [] if isinstance(detail, dict) else []

            for c in subs:
                ext_comment_id = str(c.get('id') or '')
                if not ext_comment_id:
                    continue

                if ext_comment_id in existing_ext_ids:
                    skipped += 1
                    continue

                text = strip_html(c.get('comment') or '')
                if not text:
                    continue

                # timestamp в vsDesk: "21.02.2026 15:50:05" — парсим
                ts_raw = c.get('timestamp') or ''
                created_at = None
                if ts_raw:
                    try:
                        created_at = datetime.strptime(ts_raw, '%d.%m.%Y %H:%M:%S')
                    except Exception:
                        created_at = None

                # show=0 публичный, show=1 внутренний
                is_internal = bool(c.get('show') == 1)

                cur.execute(
                    '''INSERT INTO ticket_comments
                       (ticket_id, user_id, comment, is_internal, created_at, external_id, external_source)
                       VALUES (%s, %s, %s, %s, %s, %s, 'vsdesk')''',
                    (local_ticket_id, 1, text, is_internal, created_at, ext_comment_id)
                )
                existing_ext_ids.add(ext_comment_id)
                inserted += 1

    conn.commit()
    print(f"[vsdesk-sync] comments: inserted={inserted}, skipped={skipped}, errors={errors}")
    return {'inserted': inserted, 'skipped': skipped, 'errors': errors}


def handler(event: dict, context) -> dict:
    """Синхронизирует заявки и комментарии из vsDesk в локальную базу"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    if not VSDESK_LOGIN or not VSDESK_PASSWORD:
        return api_response(500, {'error': 'VSDESK_LOGIN / VSDESK_PASSWORD не заданы'})

    conn = get_db()
    try:
        since_dt = get_last_sync_time(conn)

        try:
            all_requests = vsdesk_get('/api/requests/')
        except Exception as e:
            return api_response(502, {'error': f'Ошибка запроса к vsDesk: {str(e)}'})

        ticket_stats = sync_tickets(all_requests, conn, since_dt=since_dt)
        comment_stats = sync_comments(ticket_stats['ext_to_local'], conn)
    finally:
        conn.close()

    return api_response(200, {
        'success': True,
        'tickets': {
            'synced': ticket_stats['inserted'],
            'skipped': ticket_stats['skipped'],
            'filtered_out': ticket_stats['filtered_out'],
            'total_received': len(all_requests),
        },
        'comments': {
            'synced': comment_stats['inserted'],
            'skipped': comment_stats['skipped'],
            'errors': comment_stats['errors'],
        },
        'since': since_dt,
        'message': f"Заявок: {ticket_stats['inserted']} новых. Комментариев: {comment_stats['inserted']} новых.",
    })