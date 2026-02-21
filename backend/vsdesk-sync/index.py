"""
Синхронизация заявок из vsDesk со статусом «Открыта» в локальную базу данных.
Фильтрация по статусу и дате выполняется на стороне клиента.
"""
import json
import os
import re
import base64
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

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


def vsdesk_fetch_all() -> list:
    """Получает все заявки из vsDesk через Basic Auth"""
    url = f'{VSDESK_URL}/api/requests/'
    req = urllib.request.Request(url, headers={
        'Authorization': basic_auth_header(),
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode('utf-8-sig'))

    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get('requests') or data.get('data') or data.get('items') or []
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
    """Фильтрует по статусу «Открыта» и дате, сохраняет новые заявки"""
    inserted = 0
    skipped = 0
    filtered_out = 0

    with conn.cursor() as cur:
        for req in requests_list:
            # Фильтр: только «Открыта» (closed=1 в vsDesk означает статус "Открыта")
            status_raw = (req.get('Status') or '').strip()
            closed_val = str(req.get('closed') or '').strip()

            is_open = status_raw.lower() in OPEN_STATUS_VALUES or closed_val == '1'
            if not is_open:
                filtered_out += 1
                continue

            # Фильтр по дате — только новее последней синхронизации
            ts = req.get('timestamp') or ''
            if since_dt and ts and ts <= since_dt:
                filtered_out += 1
                continue

            ext_id = str(req.get('id') or '')
            if not ext_id:
                continue

            cur.execute(
                "SELECT id FROM tickets WHERE external_id = %s AND external_source = 'vsdesk'",
                (ext_id,)
            )
            if cur.fetchone():
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
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'vsdesk')''',
                (title, description, 1, priority_id, 1,
                 due_date, created_at, ext_id)
            )
            inserted += 1

    conn.commit()
    return {'inserted': inserted, 'skipped': skipped, 'filtered_out': filtered_out}


def handler(event: dict, context) -> dict:
    """Синхронизирует заявки со статусом «Открыта» из vsDesk в локальную базу"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    if not VSDESK_LOGIN or not VSDESK_PASSWORD:
        return api_response(500, {'error': 'VSDESK_LOGIN / VSDESK_PASSWORD не заданы'})

    conn = get_db()
    try:
        since_dt = get_last_sync_time(conn)

        try:
            all_requests = vsdesk_fetch_all()
        except Exception as e:
            return api_response(502, {'error': f'Ошибка запроса к vsDesk: {str(e)}'})

        stats = sync_tickets(all_requests, conn, since_dt=since_dt)
    finally:
        conn.close()

    return api_response(200, {
        'success': True,
        'synced': stats['inserted'],
        'skipped': stats['skipped'],
        'filtered_out': stats['filtered_out'],
        'total_received': len(all_requests),
        'since': since_dt,
        'message': f"Синхронизировано {stats['inserted']} новых заявок из vsDesk",
    })
