"""
API для работы с комментариями к заявкам
"""
import json
from typing import Dict, Any
from pydantic import BaseModel, Field
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA


class CommentRequest(BaseModel):
    ticket_id: int = Field(..., gt=0)
    comment: str = Field(..., min_length=1)
    is_internal: bool = Field(default=False)


def handler(event: dict, context) -> dict:
    """API для работы с комментариями к заявкам"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return handle_options()
    
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    conn = get_db_connection()
    if not conn:
        return response(500, {'error': 'Database connection failed'})
    
    try:
        if method == 'GET':
            return handle_get_comments(event, conn, payload)
        elif method == 'POST':
            return handle_create_comment(event, conn, payload)
        elif method == 'DELETE':
            return handle_delete_comment(event, conn, payload)
        else:
            return response(405, {'error': 'Method not allowed'})
    finally:
        conn.close()


def handle_get_comments(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Получение комментариев к заявке"""
    params = event.get('queryStringParameters', {}) or {}
    ticket_id = params.get('ticket_id')
    
    if not ticket_id:
        return response(400, {'error': 'ticket_id parameter required'})
    
    cur = conn.cursor()
    
    cur.execute(f"""
        SELECT 
            tc.id,
            tc.ticket_id,
            tc.user_id,
            tc.comment,
            tc.is_internal,
            tc.created_at,
            tc.is_read,
            u.username as user_name,
            u.full_name as user_full_name
        FROM {SCHEMA}.ticket_comments tc
        LEFT JOIN {SCHEMA}.users u ON tc.user_id = u.id
        WHERE tc.ticket_id = %s
        ORDER BY tc.created_at DESC
    """, (int(ticket_id),))
    
    comments = [dict(row) for row in cur.fetchall()]
    cur.close()
    
    return response(200, {'comments': comments})


def handle_create_comment(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Создание комментария к заявке"""
    body = json.loads(event.get('body', '{}'))
    
    try:
        data = CommentRequest(**body)
    except Exception as e:
        return response(400, {'error': f'Validation error: {str(e)}'})
    
    user_id = payload['user_id']
    
    cur = conn.cursor()
    
    # Проверяем существование заявки
    cur.execute(f"SELECT id FROM {SCHEMA}.tickets WHERE id = %s", (data.ticket_id,))
    if not cur.fetchone():
        cur.close()
        return response(404, {'error': 'Ticket not found'})
    
    # Создаем комментарий
    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_comments 
        (ticket_id, user_id, comment, is_internal, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        RETURNING id, ticket_id, user_id, comment, is_internal, created_at, is_read
    """, (data.ticket_id, user_id, data.comment, data.is_internal))
    
    comment = dict(cur.fetchone())
    
    # Добавляем запись в историю
    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_history 
        (ticket_id, user_id, field_name, old_value, new_value, created_at)
        VALUES (%s, %s, 'comment', NULL, %s, NOW())
    """, (data.ticket_id, user_id, f'Добавлен комментарий: {data.comment[:50]}...'))
    
    cur.execute(f"""
        UPDATE {SCHEMA}.tickets 
        SET updated_at = NOW(),
            has_response = CASE WHEN has_response = false THEN true ELSE has_response END
        WHERE id = %s
    """, (data.ticket_id,))
    
    conn.commit()
    
    # Получаем данные пользователя
    cur.execute(f"""
        SELECT username as user_name, full_name as user_full_name
        FROM {SCHEMA}.users
        WHERE id = %s
    """, (user_id,))
    user_data = dict(cur.fetchone())
    
    comment.update(user_data)
    cur.close()
    
    return response(201, comment)


def handle_delete_comment(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Удаление комментария"""
    body = json.loads(event.get('body', '{}'))
    comment_id = body.get('id')
    
    if not comment_id:
        return response(400, {'error': 'Comment ID required'})
    
    user_id = payload['user_id']
    
    cur = conn.cursor()
    
    # Проверяем, что комментарий принадлежит пользователю
    cur.execute(f"""
        SELECT user_id, ticket_id 
        FROM {SCHEMA}.ticket_comments 
        WHERE id = %s
    """, (comment_id,))
    
    comment = cur.fetchone()
    if not comment:
        cur.close()
        return response(404, {'error': 'Comment not found'})
    
    if comment['user_id'] != user_id:
        cur.close()
        return response(403, {'error': 'You can only delete your own comments'})
    
    # Удаляем комментарий
    cur.execute(f"DELETE FROM {SCHEMA}.ticket_comments WHERE id = %s", (comment_id,))
    
    # Добавляем запись в историю
    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_history 
        (ticket_id, user_id, field_name, old_value, new_value, created_at)
        VALUES (%s, %s, 'comment', 'Удален комментарий', NULL, NOW())
    """, (comment['ticket_id'], user_id))
    
    conn.commit()
    cur.close()
    
    return response(200, {'message': 'Комментарий удален'})