"""
API для работы с историей изменений заявок
"""
from typing import Dict, Any
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA


def _can_see_internal(cur, user_id: int) -> bool:
    """Скрытые (внутренние) комментарии и связанные события истории
    видят только Администратор и Исполнитель"""
    if not user_id:
        return False
    cur.execute(f"""
        SELECT r.name, r.system_role
        FROM {SCHEMA}.user_roles ur
        JOIN {SCHEMA}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s
    """, (int(user_id),))
    for row in cur.fetchall():
        name = (row.get('name') or '').strip().lower()
        system_role = (row.get('system_role') or '').strip().lower()
        if system_role in ('admin', 'executor') or name in ('admin', 'администратор', 'исполнитель'):
            return True
    return False


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
        
        # Скрытые (внутренние) события истории видят только Администратор и Исполнитель
        internal_filter = '' if _can_see_internal(cur, payload.get('user_id')) else 'AND th.is_internal = false'

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
            WHERE th.ticket_id = %s {internal_filter}
            ORDER BY th.created_at DESC
        """, (int(ticket_id),))
        
        history = [dict(row) for row in cur.fetchall()]
        cur.close()
        
        return response(200, {'logs': history})
    
    finally:
        conn.close()