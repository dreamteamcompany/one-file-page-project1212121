"""
API для работы с комментариями к заявкам
"""
import json
import os
import urllib.request
import urllib.parse
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA

BITRIX_PORTAL_URL = os.environ.get('BITRIX24_PORTAL_URL', '').rstrip('/')
BITRIX_BOT_ID = os.environ.get('BITRIX_BOT_ID', '')
BITRIX_BOT_CLIENT_ID = os.environ.get('BITRIX_BOT_CLIENT_ID', '')
BITRIX_BOT_CLIENT_SECRET = os.environ.get('BITRIX_BOT_CLIENT_SECRET', '')
BITRIX_BOT_REFRESH_TOKEN = os.environ.get('BITRIX_BOT_REFRESH_TOKEN', '')

_bot_access_token = None


class CommentRequest(BaseModel):
    ticket_id: int = Field(..., gt=0)
    comment: str = Field(..., min_length=1)
    is_internal: bool = Field(default=False)
    requires_response: bool = Field(default=True)


class ClearIndicationRequest(BaseModel):
    ticket_id: int = Field(..., gt=0)


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
        params = event.get('queryStringParameters', {}) or {}
        action = params.get('action')

        if method == 'POST' and action == 'clear_indication':
            return handle_clear_indication(event, conn, payload)

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


def _resolve_author_side(cur, ticket_id: int, user_id: int) -> str:
    """Определяет, кто автор сообщения: 'customer' | 'executor' | None
    Возвращает сторону автора, чтобы поставить индикацию противоположной стороне.
    """
    cur.execute(f"""
        SELECT created_by, assigned_to, executor_group_id FROM {SCHEMA}.tickets WHERE id = %s
    """, (ticket_id,))
    row = cur.fetchone()
    if not row:
        return None
    if row['created_by'] == user_id:
        return 'customer'
    if row['assigned_to'] == user_id:
        return 'executor'
    if row.get('executor_group_id'):
        cur.execute(f"""
            SELECT 1 FROM {SCHEMA}.executor_group_members
            WHERE group_id = %s AND user_id = %s
            LIMIT 1
        """, (row['executor_group_id'], user_id))
        if cur.fetchone():
            return 'executor'
    cur.execute(f"""
        SELECT r.system_role
        FROM {SCHEMA}.user_roles ur
        JOIN {SCHEMA}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s
    """, (user_id,))
    roles = [r['system_role'] for r in cur.fetchall() if r.get('system_role')]
    if 'executor' in roles or 'admin' in roles:
        return 'executor'
    return 'customer'


def handle_get_comments(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Получение комментариев к заявке"""
    params = event.get('queryStringParameters', {}) or {}
    ticket_id = params.get('ticket_id')

    if not ticket_id:
        return response(400, {'error': 'ticket_id parameter required'})

    cur = conn.cursor()

    cur.execute(f"""
        SELECT 
            tc.id, tc.ticket_id, tc.user_id, tc.comment,
            tc.is_internal, tc.created_at, tc.is_read, tc.requires_response,
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

    cur.execute(f"""
        SELECT t.id, t.assigned_to, t.status_id, ts.is_reopened
        FROM {SCHEMA}.tickets t
        JOIN {SCHEMA}.ticket_statuses ts ON ts.id = t.status_id
        WHERE t.id = %s
    """, (data.ticket_id,))
    ticket = cur.fetchone()
    if not ticket:
        cur.close()
        return response(404, {'error': 'Ticket not found'})

    if ticket['is_reopened'] and ticket['assigned_to'] == user_id:
        cur.close()
        return response(403, {'error': 'Для добавления комментария необходимо сначала принять заявку в работу'})

    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_comments 
        (ticket_id, user_id, comment, is_internal, requires_response, created_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        RETURNING id, ticket_id, user_id, comment, is_internal, requires_response, created_at, is_read
    """, (data.ticket_id, user_id, data.comment, data.is_internal, data.requires_response))

    comment = dict(cur.fetchone())

    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_history 
        (ticket_id, user_id, field_name, old_value, new_value, created_at)
        VALUES (%s, %s, 'comment', NULL, %s, NOW())
    """, (data.ticket_id, user_id, f'Добавлен комментарий: {data.comment[:50]}...'))

    author_side = _resolve_author_side(cur, data.ticket_id, user_id)
    if data.is_internal:
        awaiting = None
    elif not data.requires_response:
        awaiting = 'none'
    elif author_side == 'customer':
        awaiting = 'executor'
    elif author_side == 'executor':
        awaiting = 'customer'
    else:
        awaiting = None

    if awaiting is not None:
        cur.execute(f"""
            UPDATE {SCHEMA}.tickets 
            SET updated_at = NOW(),
                has_response = CASE WHEN has_response = false THEN true ELSE has_response END,
                awaiting_response_from = %s,
                awaiting_since = CASE WHEN %s = 'none' THEN NULL ELSE NOW() END,
                awaiting_cleared_by = CASE WHEN %s = 'none' THEN 'author_no_response' ELSE NULL END
            WHERE id = %s
        """, (awaiting, awaiting, awaiting, data.ticket_id))
    else:
        cur.execute(f"""
            UPDATE {SCHEMA}.tickets 
            SET updated_at = NOW(),
                has_response = CASE WHEN has_response = false THEN true ELSE has_response END
            WHERE id = %s
        """, (data.ticket_id,))

    conn.commit()

    cur.execute(f"""
        SELECT username as user_name, full_name as user_full_name, photo_url as user_photo_url
        FROM {SCHEMA}.users WHERE id = %s
    """, (user_id,))
    user_data = dict(cur.fetchone())
    comment.update(user_data)

    try:
        headers = event.get('headers', {})
        origin = headers.get('Origin') or headers.get('origin') or headers.get('Referer') or headers.get('referer') or ''
        if origin:
            origin = origin.rstrip('/')
            parts = origin.replace('https://', '').replace('http://', '')
            if '/' in parts:
                origin = origin.split('/')[0] + '//' + origin.split('/')[2]
        print(f"[bitrix-bot] Sending notification for ticket {data.ticket_id}, author {user_id}")
        send_bitrix_notifications(cur, data.ticket_id, user_id, data.comment, data.is_internal, origin)
    except Exception as e:
        import traceback
        print(f"[bitrix-bot] Error: {e}\n{traceback.format_exc()}")

    cur.close()
    return response(201, comment)


def handle_clear_indication(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Ручное снятие индикации 'Ожидает ответа' получателем"""
    body = json.loads(event.get('body', '{}'))

    try:
        data = ClearIndicationRequest(**body)
    except Exception as e:
        return response(400, {'error': f'Validation error: {str(e)}'})

    user_id = payload['user_id']
    cur = conn.cursor()

    cur.execute(f"""
        SELECT id, created_by, assigned_to, executor_group_id, awaiting_response_from
        FROM {SCHEMA}.tickets WHERE id = %s
    """, (data.ticket_id,))
    ticket = cur.fetchone()
    if not ticket:
        cur.close()
        return response(404, {'error': 'Ticket not found'})

    current_side = ticket['awaiting_response_from']
    if current_side in (None, 'none'):
        cur.close()
        return response(200, {'message': 'Индикация уже снята', 'awaiting_response_from': 'none'})

    is_customer = ticket['created_by'] == user_id
    is_executor = ticket['assigned_to'] == user_id

    if not is_executor and ticket.get('executor_group_id'):
        cur.execute(f"""
            SELECT 1 FROM {SCHEMA}.executor_group_members
            WHERE group_id = %s AND user_id = %s
            LIMIT 1
        """, (ticket['executor_group_id'], user_id))
        if cur.fetchone():
            is_executor = True

    cur.execute(f"""
        SELECT r.system_role
        FROM {SCHEMA}.user_roles ur
        JOIN {SCHEMA}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s
    """, (user_id,))
    roles = [r['system_role'] for r in cur.fetchall() if r.get('system_role')]
    is_admin = 'admin' in roles

    allowed = (
        (current_side == 'customer' and is_customer) or
        (current_side == 'executor' and is_executor) or
        is_admin
    )
    if not allowed:
        cur.close()
        return response(403, {'error': 'Снять индикацию может только получатель или администратор'})

    cur.execute(f"""
        UPDATE {SCHEMA}.tickets
        SET awaiting_response_from = 'none',
            awaiting_since = NULL,
            awaiting_cleared_by = 'manual',
            updated_at = NOW()
        WHERE id = %s
    """, (data.ticket_id,))

    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_history
        (ticket_id, user_id, field_name, old_value, new_value, created_at)
        VALUES (%s, %s, 'indication', %s, 'none', NOW())
    """, (data.ticket_id, user_id, current_side))

    conn.commit()
    cur.close()
    return response(200, {'message': 'Индикация снята', 'awaiting_response_from': 'none'})


def handle_delete_comment(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Удаление комментария"""
    body = json.loads(event.get('body', '{}'))
    comment_id = body.get('id')

    if not comment_id:
        return response(400, {'error': 'Comment ID required'})

    user_id = payload['user_id']
    cur = conn.cursor()

    cur.execute(f"""
        SELECT user_id, ticket_id FROM {SCHEMA}.ticket_comments WHERE id = %s
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


def _priority_emoji(priority_name: str) -> str:
    name = priority_name.lower()
    if 'критич' in name:
        return '🚨🚨🚨'
    if 'высок' in name:
        return '⚠️⚠️⚠️'
    if 'средн' in name:
        return '🟠🟠🟠'
    return '⚪️⚪️⚪️'


def send_bitrix_notifications(cur, ticket_id: int, author_user_id: int, comment_text: str, is_internal: bool, app_origin: str = ''):
    """Отправляет уведомления через чат-бота DreamDesk в Битрикс24"""
    if not BITRIX_BOT_ID or not BITRIX_PORTAL_URL:
        print(f"[bitrix-bot] Bot not configured (BOT_ID={bool(BITRIX_BOT_ID)}, PORTAL={bool(BITRIX_PORTAL_URL)})")
        return

    cur.execute(f"""
        SELECT t.id, t.title, t.created_by, t.assigned_to,
               author.full_name AS author_name,
               creator.bitrix_user_id AS creator_bitrix_id,
               executor.bitrix_user_id AS executor_bitrix_id,
               p.name AS priority_name
        FROM {SCHEMA}.tickets t
        JOIN {SCHEMA}.users author ON author.id = %s
        LEFT JOIN {SCHEMA}.users creator ON creator.id = t.created_by
        LEFT JOIN {SCHEMA}.users executor ON executor.id = t.assigned_to
        LEFT JOIN {SCHEMA}.ticket_priorities p ON t.priority_id = p.id
        WHERE t.id = %s
    """, (author_user_id, ticket_id))

    row = cur.fetchone()
    if not row:
        return

    recipients = _collect_recipients(row, author_user_id, is_internal)
    if not recipients:
        print(f"[bitrix-bot] No recipients for ticket {ticket_id}")
        return

    preview = comment_text[:150] + ('...' if len(comment_text) > 150 else '')
    ticket_title = row['title'] or f"Заявка #{row['id']}"

    ticket_url = ''
    if app_origin:
        ticket_url = f"{app_origin}/tickets/{row['id']}"

    access_token = _get_bot_token()
    if not access_token:
        print("[bitrix-bot] Failed to get access token")
        return

    priority_emoji = _priority_emoji(row.get('priority_name') or '')

    for r in recipients:
        message = (
            f"{priority_emoji} [b]Новый комментарий в заявке #{row['id']}[/b]\n"
            f"{ticket_title}\n\n"
            f"[b]{row['author_name']}[/b]: {preview}"
        )

        keyboard = []
        if ticket_url:
            keyboard = [
                {
                    "TEXT": f"📋 Открыть заявку #{row['id']}",
                    "LINK": ticket_url,
                    "BG_COLOR": "#3B82F6",
                    "TEXT_COLOR": "#FFFFFF",
                    "DISPLAY": "LINE",
                    "BLOCK": "Y"
                }
            ]

        _send_bot_message(access_token, r['bitrix_id'], message, keyboard)


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


def _get_bot_token() -> str:
    """Получает access_token для бота, обновляя через refresh_token"""
    global _bot_access_token
    if _bot_access_token:
        return _bot_access_token

    if not BITRIX_BOT_REFRESH_TOKEN or not BITRIX_BOT_CLIENT_ID or not BITRIX_BOT_CLIENT_SECRET:
        print("[bitrix-bot] Missing bot credentials for token refresh")
        return ''

    params = urllib.parse.urlencode({
        'grant_type': 'refresh_token',
        'client_id': BITRIX_BOT_CLIENT_ID,
        'client_secret': BITRIX_BOT_CLIENT_SECRET,
        'refresh_token': BITRIX_BOT_REFRESH_TOKEN,
    })
    url = f"https://oauth.bitrix.info/oauth/token/?{params}"

    try:
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            _bot_access_token = data.get('access_token', '')
            new_refresh = data.get('refresh_token', '')
            if new_refresh:
                print(f"[bitrix-bot] Token refreshed. New refresh_token: {new_refresh[:20]}...")
            return _bot_access_token
    except Exception as e:
        print(f"[bitrix-bot] Token refresh failed: {e}")
        return ''


def _send_bot_message(access_token: str, bitrix_user_id: str, message: str, keyboard: list = None):
    """Отправляет сообщение от имени чат-бота DreamDesk"""
    url = f"{BITRIX_PORTAL_URL}/rest/imbot.message.add.json?auth={access_token}"

    payload = {
        'BOT_ID': BITRIX_BOT_ID,
        'DIALOG_ID': bitrix_user_id,
        'MESSAGE': message,
    }

    if keyboard:
        payload['KEYBOARD'] = keyboard

    data = json.dumps(payload).encode('utf-8')

    try:
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=5) as r:
            result = json.loads(r.read().decode())
            print(f"[bitrix-bot] Message sent to {bitrix_user_id}: {result.get('result', 'unknown')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ''
        print(f"[bitrix-bot] HTTP {e.code} sending to {bitrix_user_id}: {body[:300]}")
    except Exception as e:
        print(f"[bitrix-bot] Failed to send to {bitrix_user_id}: {e}")