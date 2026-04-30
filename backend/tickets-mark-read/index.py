"""
API сброса непрочитанного по заявке для текущего юзера.
POST /tickets-mark-read body: { "ticket_id": int }
- Обновляет ticket_views.last_seen_at = NOW()
- Помечает is_read=true все notifications текущего юзера по этой заявке
"""
import json
from typing import Dict, Any
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA


def handler(event: dict, context) -> dict:
    """Сбрасывает непрочитанное по заявке для текущего юзера"""
    method = event.get('httpMethod', 'POST')

    if method == 'OPTIONS':
        return handle_options()

    if method != 'POST':
        return response(405, {'error': 'Method not allowed'})

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    user_id = payload['user_id']

    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return response(400, {'error': 'Invalid JSON'})

    ticket_id = body.get('ticket_id')
    mark_all = bool(body.get('mark_all'))

    if not ticket_id and not mark_all:
        return response(400, {'error': 'ticket_id or mark_all required'})

    conn = get_db_connection()
    try:
        cur = conn.cursor()

        if ticket_id:
            try:
                tid = int(ticket_id)
            except (TypeError, ValueError):
                return response(400, {'error': 'ticket_id must be integer'})

            cur.execute(f"""
                INSERT INTO {SCHEMA}.ticket_views (user_id, ticket_id, last_seen_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (user_id, ticket_id)
                DO UPDATE SET last_seen_at = NOW()
            """, (user_id, tid))

            cur.execute(f"""
                UPDATE {SCHEMA}.notifications
                SET is_read = true, updated_at = NOW()
                WHERE user_id = %s AND ticket_id = %s AND is_read = false
            """, (user_id, tid))

            updated = cur.rowcount
            conn.commit()
            cur.close()
            return response(200, {'success': True, 'ticket_id': tid, 'cleared': updated})

        cur.execute(f"""
            UPDATE {SCHEMA}.notifications
            SET is_read = true, updated_at = NOW()
            WHERE user_id = %s AND is_read = false
        """, (user_id,))
        updated = cur.rowcount

        cur.execute(f"""
            INSERT INTO {SCHEMA}.ticket_views (user_id, ticket_id, last_seen_at)
            SELECT %s, t.id, NOW() FROM {SCHEMA}.tickets t
            WHERE EXISTS (
                SELECT 1 FROM {SCHEMA}.notifications n
                WHERE n.user_id = %s AND n.ticket_id = t.id
            )
            ON CONFLICT (user_id, ticket_id)
            DO UPDATE SET last_seen_at = NOW()
        """, (user_id, user_id))

        conn.commit()
        cur.close()
        return response(200, {'success': True, 'cleared': updated})
    finally:
        conn.close()
