"""
Синхронизация новых заявок из vsDesk в локальную базу данных.
Использует Basic Auth, получает заявки со статусом Открыта (StatusId=1).
"""
import json
import os
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


def vsdesk_fetch(path: str, params: dict = None) -> object:
    """Выполняет GET запрос к vsDesk API"""
    url = f'{VSDESK_URL}{path}'
    if params:
        url += '?' + urllib.parse.urlencode(params)

    req = urllib.request.Request(url, headers={
        'Authorization': basic_auth_header(),
        'Accept': 'application/json',
    })

    with urllib.request.urlopen(req, timeout=25) as resp:
        raw = resp.read()
        return json.loads(raw.decode('utf-8-sig'))


def map_priority(priority_val) -> int:
    mapping = {
        'low': 5, 'низкий': 5,
        'normal': 2, 'medium': 2, 'средний': 2,
        'high': 3, 'высокий': 3,
        'critical': 4, 'urgent': 4, 'критический': 4,
    }
    if priority_val is None:
        return 2
    return mapping.get(str(priority_val).lower(), 2)


def map_status(status_val) -> int:
    mapping = {
        '1': 1, 'new': 1, 'новая': 1, 'открыта': 1, 'открытая': 1,
        '2': 7, 'in_progress': 7, 'в работе': 7,
        '3': 9, 'closed': 9, 'решена': 9, 'закрыта': 9,
        '9': 14, 'pending': 14, 'отложена': 14,
    }
    if status_val is None:
        return 1
    return mapping.get(str(status_val).lower(), 1)


def get_last_sync_time(conn) -> str:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT MAX(created_at) FROM tickets WHERE external_source = 'vsdesk'"
        )
        row = cur.fetchone()
        if row and row['max']:
            dt = row['max']
            if hasattr(dt, 'strftime'):
                return dt.strftime('%Y-%m-%d %H:%M')
    return None


def sync_tickets(requests_list: list, conn) -> dict:
    inserted = 0
    skipped = 0

    with conn.cursor() as cur:
        for req in requests_list:
            ext_id = str(req.get('Id') or req.get('id') or '')
            if not ext_id:
                continue

            cur.execute(
                "SELECT id FROM tickets WHERE external_id = %s AND external_source = 'vsdesk'",
                (ext_id,)
            )
            if cur.fetchone():
                skipped += 1
                continue

            title = (req.get('Name') or req.get('name') or req.get('Subject') or
                     req.get('subject') or req.get('title') or 'Без темы')
            description = (req.get('Content') or req.get('content') or
                           req.get('Description') or req.get('description') or '')
            due_date = (req.get('DeadLine') or req.get('deadline') or
                        req.get('due_date') or req.get('DueDate') or None)
            created_at = (req.get('TimeAdd') or req.get('created_at') or
                          req.get('CreatedAt') or None)

            priority_raw = (req.get('Priority') or req.get('priority') or
                            req.get('PriorityId') or 'normal')
            status_raw = (req.get('Status') or req.get('status') or
                          req.get('StatusId') or '1')

            priority_id = map_priority(priority_raw)
            status_id = map_status(status_raw)

            cur.execute(
                '''INSERT INTO tickets
                   (title, description, status_id, priority_id, created_by,
                    due_date, created_at, external_id, external_source)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'vsdesk')''',
                (title[:500], description, status_id, priority_id, 1,
                 due_date, created_at, ext_id)
            )
            inserted += 1

    conn.commit()
    return {'inserted': inserted, 'skipped': skipped}


def handler(event: dict, context) -> dict:
    """Синхронизирует заявки со статусом Открыта из vsDesk в локальную базу"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    # Режим диагностики — смотрим структуру ответа vsDesk
    query = event.get('queryStringParameters') or {}
    if query.get('debug') == '1':
        try:
            data = vsdesk_fetch('/api/requests/', {'StatusId': '1'})
            sample = data[:2] if isinstance(data, list) else data
            total = len(data) if isinstance(data, list) else '?'
            return api_response(200, {'total': total, 'sample': sample})
        except Exception as e:
            return api_response(502, {'error': str(e)})

    if not VSDESK_LOGIN or not VSDESK_PASSWORD:
        return api_response(500, {'error': 'VSDESK_LOGIN / VSDESK_PASSWORD не заданы'})

    conn = get_db()
    try:
        since_dt = get_last_sync_time(conn)

        if not since_dt:
            since_dt = (datetime.now() - timedelta(hours=24)).strftime('%Y-%m-%d %H:%M')

        params = {'StatusId': '1', 'TimeAdd': f'>{since_dt}'}

        try:
            data = vsdesk_fetch('/api/requests/', params)
        except Exception as e:
            return api_response(502, {'error': f'Ошибка запроса к vsDesk: {str(e)}'})

        requests_list = data if isinstance(data, list) else (
            data.get('requests') or data.get('data') or data.get('items') or []
        )

        stats = sync_tickets(requests_list, conn)
    finally:
        conn.close()

    return api_response(200, {
        'success': True,
        'synced': stats['inserted'],
        'skipped': stats['skipped'],
        'total_received': len(requests_list),
        'since': since_dt,
        'message': f"Синхронизировано {stats['inserted']} новых заявок из vsDesk",
    })
