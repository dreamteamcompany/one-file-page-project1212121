"""
API для работы с комментариями к заявкам
"""
import json
import os
import urllib.request
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA

BITRIX_WEBHOOK_URL = os.environ.get('BITRIX24_WEBHOOK_URL', '').rstrip('/')


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
            u.full_name as user_full_name,
            u.photo_url as user_photo_url
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
    
    cur.execute(f"SELECT id FROM {SCHEMA}.tickets WHERE id = %s", (data.ticket_id,))
    if not cur.fetchone():
        cur.close()
        return response(404, {'error': 'Ticket not found'})
    
    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_comments 
        (ticket_id, user_id, comment, is_internal, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        RETURNING id, ticket_id, user_id, comment, is_internal, created_at, is_read
    """, (data.ticket_id, user_id, data.comment, data.is_internal))
    
    comment = dict(cur.fetchone())
    
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
    
    cur.execute(f"""
        SELECT username as user_name, full_name as user_full_name, photo_url as user_photo_url
        FROM {SCHEMA}.users
        WHERE id = %s
    """, (user_id,))
    user_data = dict(cur.fetchone())
    
    comment.update(user_data)

    try:
        print(f"[bitrix-notify] Starting notification for ticket {data.ticket_id}, author {user_id}, webhook configured: {bool(BITRIX_WEBHOOK_URL)}")
        send_bitrix_notifications(cur, data.ticket_id, user_id, data.comment, data.is_internal)
    except Exception as e:
        import traceback
        print(f"[bitrix-notify] Error: {e}\n{traceback.format_exc()}")

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
    
    cur.execute(f"DELETE FROM {SCHEMA}.ticket_comments WHERE id = %s", (comment_id,))
    
    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_history 
        (ticket_id, user_id, field_name, old_value, new_value, created_at)
        VALUES (%s, %s, 'comment', 'Удален комментарий', NULL, NOW())
    """, (comment['ticket_id'], user_id))
    
    conn.commit()
    cur.close()
    
    return response(200, {'message': 'Комментарий удален'})


def send_bitrix_notifications(cur, ticket_id: int, author_user_id: int, comment_text: str, is_internal: bool):
    """Отправляет уведомления в Битрикс24 чат получателям"""
    if not BITRIX_WEBHOOK_URL:
        print(f"[bitrix-notify] BITRIX24_WEBHOOK_URL is empty, skipping")
        return
    print(f"[bitrix-notify] Webhook URL: {BITRIX_WEBHOOK_URL[:40]}...")

    cur.execute(f"""
        SELECT t.id, t.title, t.created_by, t.assigned_to,
               author.full_name AS author_name,
               creator.bitrix_user_id AS creator_bitrix_id,
               executor.bitrix_user_id AS executor_bitrix_id
        FROM {SCHEMA}.tickets t
        JOIN {SCHEMA}.users author ON author.id = %s
        LEFT JOIN {SCHEMA}.users creator ON creator.id = t.created_by
        LEFT JOIN {SCHEMA}.users executor ON executor.id = t.assigned_to
        WHERE t.id = %s
    """, (author_user_id, ticket_id))

    row = cur.fetchone()
    if not row:
        return

    recipients = _collect_recipients(row, author_user_id, is_internal)
    if not recipients:
        print(f"[bitrix-notify] No recipients found for ticket {ticket_id}")
        return
    print(f"[bitrix-notify] Recipients: {recipients}")

    preview = comment_text[:150] + ('...' if len(comment_text) > 150 else '')
    ticket_title = row['title'] or f"Заявка #{row['id']}"

    for r in recipients:
        message = (
            f"[b]Новый комментарий в заявке #{row['id']}[/b]\n"
            f"{ticket_title}\n\n"
            f"[b]{row['author_name']}[/b]: {preview}"
        )
        _send_im_message(r['bitrix_id'], message)


def _collect_recipients(row, author_user_id: int, is_internal: bool) -> List[dict]:
    """Определяет получателей уведомления"""
    recipients = []

    if is_internal:
        if row['assigned_to'] and row['assigned_to'] != author_user_id and row.get('executor_bitrix_id'):
            recipients.append({'bitrix_id': row['executor_bitrix_id'], 'role': 'executor'})
        return recipients

    if row['created_by'] != author_user_id and row.get('creator_bitrix_id'):
        recipients.append({'bitrix_id': row['creator_bitrix_id'], 'role': 'creator'})

    if row['assigned_to'] and row['assigned_to'] != author_user_id and row.get('executor_bitrix_id'):
        recipients.append({'bitrix_id': row['executor_bitrix_id'], 'role': 'executor'})

    return recipients


def _send_im_message(bitrix_user_id: str, message: str):
    """Отправляет личное сообщение пользователю в Битрикс24 чат"""
    url = f"{BITRIX_WEBHOOK_URL}/im.message.add.json"

    payload = json.dumps({
        'DIALOG_ID': bitrix_user_id,
        'MESSAGE': message
    }).encode('utf-8')

    try:
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=5) as r:
            result = json.loads(r.read().decode())
            print(f"[bitrix-notify] Message sent to user {bitrix_user_id}: {result.get('result', 'unknown')}")
    except Exception as e:
        print(f"[bitrix-notify] Failed to send message to user {bitrix_user_id}: {e}")