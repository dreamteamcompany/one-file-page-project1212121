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
    if not MAX_BOT_TOKEN:
        print('[max-bot] MAX_BOT_TOKEN is not set, skipping')
        return
    if not max_user_id:
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


def notify_watcher_added(cur, schema: str, ticket_id: int, watcher_user_id: int,
                          actor_user_id: int = None, app_origin: str = ''):
    if not MAX_BOT_TOKEN:
        print('[max-bot] Not configured, skipping watcher notification')
        return
    if not watcher_user_id or watcher_user_id == actor_user_id:
        return
    cur.execute(f"""
        SELECT t.id, t.title, watcher.max_user_id AS watcher_max_id
        FROM {schema}.tickets t
        JOIN {schema}.users watcher ON watcher.id = %s
        WHERE t.id = %s
    """, (watcher_user_id, ticket_id))
    row = cur.fetchone()
    if not row:
        print(f'[max-bot] Ticket {ticket_id} or watcher {watcher_user_id} not found')
        return
    if not row.get('watcher_max_id'):
        print(f'[max-bot] Watcher {watcher_user_id} has no max_user_id, skipping')
        return
    title = row.get('title') or f"Заявка #{row['id']}"
    message = f"👀 Вы назначены наблюдателем в заявке #{row['id']}\n{title}"
    ticket_url = f"{app_origin.rstrip('/')}/tickets/{row['id']}" if app_origin else ''
    _send_max_message(row['watcher_max_id'], message, row['id'], ticket_url)
    print(f'[max-bot] Watcher notification sent for ticket {ticket_id} to user {watcher_user_id}')