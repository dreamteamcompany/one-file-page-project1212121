"""Отправка уведомлений через чат-бота DreamDesk в Битрикс24 (для api-watcher-rules)"""
import json
import os
import urllib.request
import urllib.parse

BITRIX_PORTAL_URL = os.environ.get('BITRIX24_PORTAL_URL', '').rstrip('/')
BITRIX_BOT_ID = os.environ.get('BITRIX_BOT_ID', '')
BITRIX_BOT_CLIENT_ID = os.environ.get('BITRIX_BOT_CLIENT_ID', '')
BITRIX_BOT_CLIENT_SECRET = os.environ.get('BITRIX_BOT_CLIENT_SECRET', '')
BITRIX_BOT_REFRESH_TOKEN = os.environ.get('BITRIX_BOT_REFRESH_TOKEN', '')

_bot_access_token = None


def _get_bot_token() -> str:
    global _bot_access_token
    if _bot_access_token:
        return _bot_access_token

    if not BITRIX_BOT_REFRESH_TOKEN or not BITRIX_BOT_CLIENT_ID or not BITRIX_BOT_CLIENT_SECRET:
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
            return _bot_access_token
    except Exception as e:
        print(f"[bitrix-bot] Token refresh failed: {e}")
        return ''


def _send_bot_message(access_token: str, bitrix_user_id: str, message: str, keyboard: list = None):
    url = f"{BITRIX_PORTAL_URL}/rest/imbot.message.add.json?auth={access_token}"

    payload = {'BOT_ID': BITRIX_BOT_ID, 'DIALOG_ID': bitrix_user_id, 'MESSAGE': message}
    if keyboard:
        payload['KEYBOARD'] = keyboard

    data = json.dumps(payload).encode('utf-8')

    try:
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=5) as r:
            json.loads(r.read().decode())
    except Exception as e:
        print(f"[bitrix-bot] Failed to send to {bitrix_user_id}: {e}")


def notify_watcher_added(cur, schema: str, ticket_id: int, watcher_user_id: int, app_origin: str = ''):
    """Уведомляет пользователя о том, что его назначили наблюдателем (через правило)."""
    if not BITRIX_BOT_ID or not BITRIX_PORTAL_URL or not watcher_user_id:
        return

    cur.execute(f"""
        SELECT t.id, t.title, watcher.bitrix_user_id AS bx_id
        FROM {schema}.tickets t
        JOIN {schema}.users watcher ON watcher.id = %s
        WHERE t.id = %s
    """, (watcher_user_id, ticket_id))

    row = cur.fetchone()
    if not row:
        return

    if isinstance(row, dict):
        bx_id = row.get('bx_id')
        title = row.get('title') or f"Заявка #{ticket_id}"
        tid = row.get('id') or ticket_id
    else:
        tid, title, bx_id = row[0], row[1], row[2]
        title = title or f"Заявка #{ticket_id}"

    if not bx_id:
        return

    access_token = _get_bot_token()
    if not access_token:
        return

    message = (
        f"👀 [b]Вы назначены наблюдателем в заявке #{tid}[/b]\n"
        f"{title}"
    )

    keyboard = []
    if app_origin:
        ticket_url = f"{app_origin}/tickets/{tid}"
        keyboard = [
            {
                "TEXT": f"📋 Открыть заявку #{tid}",
                "LINK": ticket_url,
                "BG_COLOR": "#3B82F6",
                "TEXT_COLOR": "#FFFFFF",
                "DISPLAY": "LINE",
                "BLOCK": "Y",
            }
        ]

    _send_bot_message(access_token, bx_id, message, keyboard)
