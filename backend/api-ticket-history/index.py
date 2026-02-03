"""
API для работы с историей изменений заявок
"""
from typing import Dict, Any
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA


def handler(event: dict, context) -> dict:
    """API для получения истории изменений заявки"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return handle_options()
    
    if method != 'GET':
        return response(405, {'error': 'Only GET method allowed'})
    
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    params = event.get('queryStringParameters', {}) or {}
    ticket_id = params.get('ticket_id')
    
    if not ticket_id:
        return response(400, {'error': 'ticket_id parameter required'})
    
    conn = get_db_connection()
    if not conn:
        return response(500, {'error': 'Database connection failed'})
    
    try:
        cur = conn.cursor()
        
        # Проверяем существование заявки
        cur.execute(f"SELECT id FROM {SCHEMA}.tickets WHERE id = %s", (int(ticket_id),))
        if not cur.fetchone():
            cur.close()
            return response(404, {'error': 'Ticket not found'})
        
        # Получаем историю изменений
        cur.execute(f"""
            SELECT 
                th.id,
                th.ticket_id,
                th.user_id,
                th.field_name,
                th.old_value,
                th.new_value,
                th.created_at,
                u.username as user_name,
                u.full_name as user_full_name
            FROM {SCHEMA}.ticket_history th
            LEFT JOIN {SCHEMA}.users u ON th.user_id = u.id
            WHERE th.ticket_id = %s
            ORDER BY th.created_at DESC
        """, (int(ticket_id),))
        
        history = [dict(row) for row in cur.fetchall()]
        cur.close()
        
        return response(200, {'logs': history})
    
    finally:
        conn.close()
