"""Отправка уведомлений через бота в мессенджере MAX (botapi.max.ru)"""
import json
import os
import re
import urllib.request
import urllib.parse
import urllib.error

MAX_BOT_TOKEN = os.environ.get('MAX_BOT_TOKEN', '')
MAX_API_BASE = 'https://botapi.max.ru'


def _strip_bbcode(text: str) -> str:
    if not text:
        return ''
    return re.sub(r'\[/?[a-zA-Z]+\]', '', text)


def _send_max_message(max_user_id: str, text: str, ticket_id: int = None, ticket_url: str = ''):
    if not MAX_BOT_TOKEN or not max_user_id:
        return
    plain = _strip_bbcode(text)
    params = {'user_id': str(max_user_id)}
    url = f"{MAX_API_BASE}/messages?{urllib.parse.urlencode(params)}"
    payload = {'text': plain}
    if ticket_url:
        payload['attachments'] = [{
            'type': 'inline_keyboard',
            'payload': {
                'buttons': [[{
                    'type': 'link',
                    'text': f'📋 Открыть заявку #{ticket_id}' if ticket_id else '📋 Открыть заявку',
                    'url': ticket_url,
                }]]
            }
        }]
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    try:
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': MAX_BOT_TOKEN,
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            print(f'[max-bot] Sent to {max_user_id}: HTTP {resp.status}')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace') if e.fp else ''
        print(f'[max-bot] HTTP {e.code} sending to {max_user_id}: {body[:300]}')
    except Exception as e:
        print(f'[max-bot] Failed to send to {max_user_id}: {e}')


def _priority_emoji(priority_name: str) -> str:
    name = (priority_name or '').lower()
    if 'критич' in name:
        return '🚨🚨🚨'
    if 'высок' in name:
        return '⚠️⚠️⚠️'
    if 'средн' in name:
        return '🟠🟠🟠'
    return '⚪️⚪️⚪️'


def send_comment_notifications(cur, schema: str, ticket_id: int, author_user_id: int,
                                comment_text: str, is_internal: bool, app_origin: str = ''):
    """Уведомления о новом комментарии в MAX."""
    if not MAX_BOT_TOKEN:
        return

    cur.execute(f"""
        SELECT t.id, t.title, t.created_by, t.assigned_to,
               author.full_name AS author_name,
               creator.max_user_id AS creator_max_id,
               executor.max_user_id AS executor_max_id,
               p.name AS priority_name
        FROM {schema}.tickets t
        JOIN {schema}.users author ON author.id = %s
        LEFT JOIN {schema}.users creator ON creator.id = t.created_by
        LEFT JOIN {schema}.users executor ON executor.id = t.assigned_to
        LEFT JOIN {schema}.ticket_priorities p ON t.priority_id = p.id
        WHERE t.id = %s
    """, (author_user_id, ticket_id))
    row = cur.fetchone()
    if not row:
        return

    cur.execute(f"""
        SELECT tw.user_id, u.max_user_id
        FROM {schema}.ticket_watchers tw
        JOIN {schema}.users u ON u.id = tw.user_id
        WHERE tw.ticket_id = %s AND u.max_user_id IS NOT NULL
    """, (ticket_id,))
    watchers = cur.fetchall() or []

    seen = set()
    recipients = []

    def add(max_id, uid):
        if not max_id or uid == author_user_id or max_id in seen:
            return
        seen.add(max_id)
        recipients.append(max_id)

    if is_internal:
        if row['assigned_to']:
            add(row.get('executor_max_id'), row['assigned_to'])
        for w in watchers:
            add(w['max_user_id'], w['user_id'])
    else:
        add(row.get('creator_max_id'), row['created_by'])
        if row['assigned_to']:
            add(row.get('executor_max_id'), row['assigned_to'])
        for w in watchers:
            add(w['max_user_id'], w['user_id'])

    if not recipients:
        return

    clean = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', comment_text or '')
    clean = re.sub(r'<img\b[^>]*>', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'data:[^;\s)]+;base64,[A-Za-z0-9+/=]+', '', clean)
    clean = re.sub(r'\n{3,}', '\n\n', clean).strip()

    preview = clean[:150] + ('...' if len(clean) > 150 else '')
    ticket_title = row['title'] or f"Заявка #{row['id']}"
    pe = _priority_emoji(row.get('priority_name') or '')
    ticket_url = f"{app_origin.rstrip('/')}/tickets/{row['id']}" if app_origin else ''

    for max_id in recipients:
        message = (
            f"{pe} Новый комментарий в заявке #{row['id']}\n"
            f"{ticket_title}\n\n"
            f"{row['author_name']}: {preview}"
        )
        _send_max_message(max_id, message, row['id'], ticket_url)