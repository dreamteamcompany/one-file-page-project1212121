"""
Поиск пользователей для @упоминаний в комментариях.
GET ?q=<подстрока>&limit=10  — возвращает топ N активных юзеров по совпадению username/full_name/email.
"""
from typing import Dict, Any
from shared_utils import response, handle_options, verify_token, get_db_connection, SCHEMA


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """Поиск пользователей для автокомплита @упоминаний"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Unauthorized'})

    if method != 'GET':
        return response(405, {'error': 'Method not allowed'})

    qs = event.get('queryStringParameters') or {}
    query = (qs.get('q') or '').strip()
    try:
        limit = int(qs.get('limit') or 10)
    except (TypeError, ValueError):
        limit = 10
    limit = max(1, min(20, limit))

    if len(query) < 1:
        return response(200, {'users': []})

    safe_query = query.replace("'", "''").replace('\\', '\\\\').lower()
    pattern = f"%{safe_query}%"
    safe_limit = int(limit)

    sql = f"""
        SELECT id, username, full_name, email, photo_url
        FROM {SCHEMA}.users
        WHERE is_active = true
          AND (
            LOWER(username) LIKE '{pattern}'
            OR LOWER(COALESCE(full_name, '')) LIKE '{pattern}'
            OR LOWER(COALESCE(email, '')) LIKE '{pattern}'
          )
        ORDER BY
          CASE WHEN LOWER(username) LIKE '{safe_query}%' THEN 0 ELSE 1 END,
          LOWER(COALESCE(full_name, username)) ASC
        LIMIT {safe_limit}
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
            users = [
                {
                    'id': r['id'],
                    'username': r['username'],
                    'full_name': r.get('full_name'),
                    'email': r.get('email'),
                    'photo_url': r.get('photo_url'),
                }
                for r in rows
            ]
            return response(200, {'users': users})
    finally:
        conn.close()
