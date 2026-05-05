"""
API для работы с комментариями к заявкам
"""
import json
import os
import re
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Set
from pydantic import BaseModel, Field
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA

MENTION_RE = re.compile(r'@([a-zA-Z0-9_.\-]+)')


def _participants(cur, ticket_id: int, ticket: Dict[str, Any]) -> Set[int]:
    """Возвращает множество user_id всех участников заявки"""
    ids: Set[int] = set()
    if ticket.get('created_by'):
        ids.add(ticket['created_by'])
    if ticket.get('assigned_to'):
        ids.add(ticket['assigned_to'])

    cur.execute(f"SELECT user_id FROM {SCHEMA}.ticket_watchers WHERE ticket_id = %s", (ticket_id,))
    ids.update(r['user_id'] for r in cur.fetchall())

    cur.execute(f"SELECT approver_id FROM {SCHEMA}.ticket_approvers WHERE ticket_id = %s", (ticket_id,))
    ids.update(r['approver_id'] for r in cur.fetchall())
    return ids


def _resolve_mentions(cur, comment: str) -> List[Dict[str, Any]]:
    """Парсит @username из текста и возвращает [{user_id, username}] существующих юзеров"""
    usernames = set(MENTION_RE.findall(comment or ''))
    if not usernames:
        return []
    cur.execute(
        f"SELECT id, username FROM {SCHEMA}.users WHERE username = ANY(%s) AND is_active = true",
        (list(usernames),),
    )
    return [dict(row) for row in cur.fetchall()]


def _add_watcher_if_missing(cur, ticket_id: int, user_id: int) -> bool:
    """Добавляет юзера в наблюдатели если его там нет. True если добавили."""
    cur.execute(
        f"SELECT 1 FROM {SCHEMA}.ticket_watchers WHERE ticket_id = %s AND user_id = %s",
        (ticket_id, user_id),
    )
    if cur.fetchone():
        return False
    cur.execute(
        f"INSERT INTO {SCHEMA}.ticket_watchers (ticket_id, user_id, added_at) VALUES (%s, %s, NOW())",
        (ticket_id, user_id),
    )
    return True


def _create_notification(cur, user_id: int, ticket_id: int, event_type: str,
                         actor_id: int, message: str, comment_id: int = None,
                         payload: Dict[str, Any] = None) -> None:
    """Создаёт запись в notifications для конкретного юзера"""
    cur.execute(f"""
        INSERT INTO {SCHEMA}.notifications
        (user_id, ticket_id, type, message, is_read, event_type, actor_id, comment_id, payload, created_at)
        VALUES (%s, %s, %s, %s, false, %s, %s, %s, %s, NOW())
    """, (
        user_id, ticket_id, event_type, message,
        event_type, actor_id, comment_id,
        json.dumps(payload) if payload else None,
    ))

BITRIX_PORTAL_URL = os.environ.get('BITRIX24_PORTAL_URL', '').rstrip('/')
BITRIX_BOT_ID = os.environ.get('BITRIX_BOT_ID', '')
BITRIX_BOT_CLIENT_ID = os.environ.get('BITRIX_BOT_CLIENT_ID', '')
BITRIX_BOT_CLIENT_SECRET = os.environ.get('BITRIX_BOT_CLIENT_SECRET', '')
BITRIX_BOT_REFRESH_TOKEN = os.environ.get('BITRIX_BOT_REFRESH_TOKEN', '')

_bot_access_token = None


class AttachmentInput(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=2000)
    size: int = Field(default=0, ge=0)


class CommentRequest(BaseModel):
    ticket_id: int = Field(..., gt=0)
    comment: str = Field(default='', max_length=20000)
    is_internal: bool = Field(default=False)
    attachments: List[AttachmentInput] = Field(default_factory=list)


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
        params = event.get('queryStringParameters') or {}
        action = (params.get('action') or '').lower()

        if method == 'POST' and action == 'mark-read':
            return handle_mark_read(event, conn, payload)

        if method == 'POST' and action == 'toggle-pin':
            return handle_toggle_pin(event, conn, payload)

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


def handle_mark_read(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Отмечает комментарии как прочитанные текущим пользователем (батчем)"""
    user_id = payload.get('user_id')
    if not user_id:
        return response(401, {'error': 'Требуется авторизация'})

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return response(400, {'error': 'Invalid JSON'})

    raw_ids = body.get('comment_ids') or []
    if not isinstance(raw_ids, list):
        return response(400, {'error': 'comment_ids must be a list'})

    comment_ids: List[int] = []
    for v in raw_ids:
        try:
            iv = int(v)
            if iv > 0:
                comment_ids.append(iv)
        except (TypeError, ValueError):
            continue

    if not comment_ids:
        return response(200, {'marked': 0})

    cur = conn.cursor()
    ids_csv = ','.join(str(i) for i in comment_ids)
    cur.execute(f"""
        SELECT id FROM {SCHEMA}.ticket_comments
        WHERE id IN ({ids_csv}) AND user_id <> %s
    """, (int(user_id),))
    valid_ids = [r['id'] for r in cur.fetchall()]

    marked = 0
    for cid in valid_ids:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.ticket_comment_reads (comment_id, user_id, read_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (comment_id, user_id) DO NOTHING
        """, (cid, int(user_id)))
        marked += cur.rowcount or 0

    conn.commit()
    cur.close()
    return response(200, {'marked': marked, 'total': len(valid_ids)})


def handle_toggle_pin(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Закрепить или открепить комментарий. Доступно любому авторизованному пользователю."""
    user_id = payload.get('user_id')
    if not user_id:
        return response(401, {'error': 'Требуется авторизация'})

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return response(400, {'error': 'Invalid JSON'})

    try:
        comment_id = int(body.get('comment_id'))
    except (TypeError, ValueError):
        return response(400, {'error': 'comment_id is required'})

    cur = conn.cursor()
    cur.execute(
        f"SELECT id, ticket_id, is_pinned FROM {SCHEMA}.ticket_comments WHERE id = %s",
        (comment_id,),
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        return response(404, {'error': 'Comment not found'})

    new_state = not bool(row['is_pinned'])
    if new_state:
        cur.execute(
            f"""UPDATE {SCHEMA}.ticket_comments
                SET is_pinned = TRUE, pinned_at = NOW(), pinned_by = %s
                WHERE id = %s""",
            (int(user_id), comment_id),
        )
    else:
        cur.execute(
            f"""UPDATE {SCHEMA}.ticket_comments
                SET is_pinned = FALSE, pinned_at = NULL, pinned_by = NULL
                WHERE id = %s""",
            (comment_id,),
        )

    conn.commit()
    cur.close()
    return response(200, {
        'comment_id': comment_id,
        'is_pinned': new_state,
    })


def handle_get_comments(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Получение комментариев к заявке"""
    params = event.get('queryStringParameters', {}) or {}
    ticket_id = params.get('ticket_id')

    if not ticket_id:
        return response(400, {'error': 'ticket_id parameter required'})

    user_id = payload.get('user_id')
    tid = int(ticket_id)
    cur = conn.cursor()

    cur.execute(f"""
        SELECT 
            tc.id, tc.ticket_id, tc.user_id, tc.comment,
            tc.is_internal, tc.created_at,
            tc.is_pinned, tc.pinned_at, tc.pinned_by,
            u.username as user_name,
            u.full_name as user_full_name,
            u.photo_url as user_photo_url
        FROM {SCHEMA}.ticket_comments tc
        LEFT JOIN {SCHEMA}.users u ON tc.user_id = u.id
        WHERE tc.ticket_id = %s
        ORDER BY tc.created_at DESC
    """, (tid,))

    comments = [dict(row) for row in cur.fetchall()]

    comment_ids = [c['id'] for c in comments]
    reads_map: Dict[int, List[int]] = {cid: [] for cid in comment_ids}
    if comment_ids:
        ids_csv = ','.join(str(int(i)) for i in comment_ids)
        cur.execute(f"""
            SELECT comment_id, user_id FROM {SCHEMA}.ticket_comment_reads
            WHERE comment_id IN ({ids_csv})
        """)
        for r in cur.fetchall():
            reads_map.setdefault(r['comment_id'], []).append(r['user_id'])

    for c in comments:
        author = c['user_id']
        explicit = set(reads_map.get(c['id'], []))
        explicit.add(author)
        c['read_by'] = sorted(explicit)

    attachments_map: Dict[int, List[Dict[str, Any]]] = {cid: [] for cid in comment_ids}
    if comment_ids:
        ids_csv = ','.join(str(int(i)) for i in comment_ids)
        cur.execute(f"""
            SELECT id, comment_id, filename, url, size
            FROM {SCHEMA}.comment_attachments
            WHERE comment_id IN ({ids_csv})
            ORDER BY id ASC
        """)
        for r in cur.fetchall():
            attachments_map.setdefault(r['comment_id'], []).append({
                'id': r['id'],
                'filename': r['filename'],
                'url': r['url'],
                'size': r['size'],
            })
    for c in comments:
        c['attachments'] = attachments_map.get(c['id'], [])

    my_last_seen_at = None
    if user_id:
        cur.execute(f"""
            SELECT last_seen_at FROM {SCHEMA}.ticket_views
            WHERE user_id = %s AND ticket_id = %s
        """, (user_id, tid))
        row = cur.fetchone()
        if row:
            my_last_seen_at = row['last_seen_at']

    cur.execute(f"""
        SELECT created_by, assigned_to FROM {SCHEMA}.tickets WHERE id = %s
    """, (tid,))
    t_row = cur.fetchone() or {}
    participant_ids = set()
    if t_row.get('created_by'):
        participant_ids.add(t_row['created_by'])
    if t_row.get('assigned_to'):
        participant_ids.add(t_row['assigned_to'])
    cur.execute(f"SELECT user_id FROM {SCHEMA}.ticket_watchers WHERE ticket_id = %s", (tid,))
    participant_ids.update(r['user_id'] for r in cur.fetchall())
    cur.execute(f"SELECT approver_id FROM {SCHEMA}.ticket_approvers WHERE ticket_id = %s", (tid,))
    participant_ids.update(r['approver_id'] for r in cur.fetchall())

    participants_seen = {}
    if participant_ids:
        ids_list = ','.join(str(int(i)) for i in participant_ids)
        cur.execute(f"""
            SELECT user_id, last_seen_at FROM {SCHEMA}.ticket_views
            WHERE ticket_id = %s AND user_id IN ({ids_list})
        """, (tid,))
        for r in cur.fetchall():
            participants_seen[r['user_id']] = r['last_seen_at'].isoformat() if r['last_seen_at'] else None

    cur.close()

    return response(200, {
        'comments': comments,
        'my_last_seen_at': my_last_seen_at.isoformat() if my_last_seen_at else None,
        'participants_seen': participants_seen,
        'participant_ids': sorted(participant_ids),
    })


def handle_create_comment(event: Dict[str, Any], conn, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Создание комментария к заявке"""
    body = json.loads(event.get('body', '{}'))

    try:
        data = CommentRequest(**body)
    except Exception as e:
        return response(400, {'error': f'Validation error: {str(e)}'})

    if not (data.comment or '').strip() and not data.attachments:
        return response(400, {'error': 'Comment text or attachments are required'})

    user_id = payload['user_id']
    cur = conn.cursor()

    cur.execute(f"""
        SELECT t.id, t.assigned_to, t.created_by, t.status_id,
               t.previous_status_id, t.sla_paused_at, t.sla_paused_total_seconds,
               ts.is_reopened, ts.is_waiting_response
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
        (ticket_id, user_id, comment, is_internal, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        RETURNING id, ticket_id, user_id, comment, is_internal, created_at
    """, (data.ticket_id, user_id, data.comment or '', data.is_internal))

    comment = dict(cur.fetchone())

    saved_attachments: List[Dict[str, Any]] = []
    for att in data.attachments:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.comment_attachments (comment_id, filename, url, size, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            RETURNING id, filename, url, size
        """, (comment['id'], att.filename, att.url, att.size))
        row = cur.fetchone()
        if row:
            saved_attachments.append({
                'id': row['id'],
                'filename': row['filename'],
                'url': row['url'],
                'size': row['size'],
            })
    comment['attachments'] = saved_attachments

    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_history 
        (ticket_id, user_id, field_name, old_value, new_value, created_at)
        VALUES (%s, %s, 'comment', NULL, %s, NOW())
    """, (data.ticket_id, user_id, f'Добавлен комментарий: {data.comment[:50]}...'))

    is_author_creator = ticket['created_by'] == user_id
    if (
        ticket['is_waiting_response']
        and is_author_creator
        and not data.is_internal
        and ticket['previous_status_id']
    ):
        paused_seconds_to_add = 0
        if ticket['sla_paused_at']:
            cur.execute(
                "SELECT EXTRACT(EPOCH FROM (NOW() - %s))::INTEGER AS sec",
                (ticket['sla_paused_at'],),
            )
            paused_seconds_to_add = cur.fetchone()['sec'] or 0

        cur.execute(f"""
            UPDATE {SCHEMA}.tickets
            SET updated_at = NOW(),
                status_id = %s,
                previous_status_id = NULL,
                sla_paused_at = NULL,
                sla_paused_total_seconds = COALESCE(sla_paused_total_seconds, 0) + %s,
                due_date = CASE WHEN due_date IS NOT NULL
                                THEN due_date + (%s || ' seconds')::INTERVAL
                                ELSE NULL END,
                response_due_date = CASE WHEN response_due_date IS NOT NULL
                                         THEN response_due_date + (%s || ' seconds')::INTERVAL
                                         ELSE NULL END,
                waiting_reminder_sent_at = NULL
            WHERE id = %s
        """, (ticket['previous_status_id'], paused_seconds_to_add,
              paused_seconds_to_add, paused_seconds_to_add, data.ticket_id))

        cur.execute(f"""
            INSERT INTO {SCHEMA}.ticket_history
            (ticket_id, user_id, field_name, old_value, new_value, created_at)
            VALUES (%s, %s, 'status_id', %s, %s, NOW())
        """, (data.ticket_id, user_id, str(ticket['status_id']), str(ticket['previous_status_id'])))
    else:
        cur.execute(f"""
            UPDATE {SCHEMA}.tickets
            SET updated_at = NOW()
            WHERE id = %s
        """, (data.ticket_id,))

    try:
        comment_id = comment.get('id')
        comment_text = data.comment or ''
        preview = (comment_text[:120] + '...') if len(comment_text) > 120 else comment_text

        mentioned = _resolve_mentions(cur, comment_text)
        mentioned_ids = {m['id'] for m in mentioned if m['id'] != user_id}

        for m_id in mentioned_ids:
            _add_watcher_if_missing(cur, data.ticket_id, m_id)

        if not data.is_internal:
            participants = _participants(cur, data.ticket_id, ticket)
            recipients = participants - {user_id} - mentioned_ids
            for rid in recipients:
                _create_notification(
                    cur, rid, data.ticket_id, 'comment', user_id,
                    f'Новый комментарий: {preview}',
                    comment_id=comment_id,
                )

        for m_id in mentioned_ids:
            _create_notification(
                cur, m_id, data.ticket_id, 'mention', user_id,
                f'Вас упомянули в комментарии: {preview}',
                comment_id=comment_id,
            )
    except Exception as notify_err:
        import traceback
        print(f"[notifications] Error: {notify_err}\n{traceback.format_exc()}")

    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_views (user_id, ticket_id, last_seen_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (user_id, ticket_id) DO UPDATE SET last_seen_at = NOW()
    """, (user_id, data.ticket_id))

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