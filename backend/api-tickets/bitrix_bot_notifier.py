"""Отправка уведомлений через чат-бота DreamDesk в Битрикс24"""
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
                print(f"[bitrix-bot] Token refreshed ok")
            return _bot_access_token
    except Exception as e:
        print(f"[bitrix-bot] Token refresh failed: {e}")
        return ''


def _send_bot_message(access_token: str, bitrix_user_id: str, message: str, keyboard: list = None):
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


def notify_executor_assigned(cur, schema: str, ticket_id: int, assigned_to_user_id: int, app_origin: str = ''):
    """Уведомляет исполнителя о назначении на заявку"""
    if not BITRIX_BOT_ID or not BITRIX_PORTAL_URL:
        print(f"[bitrix-bot] Bot not configured, skipping assignment notification")
        return

    cur.execute(f"""
        SELECT t.id, t.title, t.description,
               p.name AS priority_name,
               executor.bitrix_user_id AS executor_bitrix_id,
               executor.full_name AS executor_name
        FROM {schema}.tickets t
        LEFT JOIN {schema}.ticket_priorities p ON t.priority_id = p.id
        JOIN {schema}.users executor ON executor.id = %s
        WHERE t.id = %s
    """, (assigned_to_user_id, ticket_id))

    row = cur.fetchone()
    if not row:
        print(f"[bitrix-bot] Ticket {ticket_id} or user {assigned_to_user_id} not found")
        return

    if not row.get('executor_bitrix_id'):
        print(f"[bitrix-bot] User {assigned_to_user_id} has no bitrix_user_id, skipping")
        return

    cur.execute(f"""
        SELECT ts.name AS ticket_service_name, s.name AS service_name, sc.name AS category_name
        FROM {schema}.ticket_to_service_mappings tsm
        LEFT JOIN {schema}.ticket_services ts ON tsm.ticket_service_id = ts.id
        LEFT JOIN {schema}.services s ON tsm.service_id = s.id
        LEFT JOIN {schema}.service_categories sc ON s.category_id = sc.id
        WHERE tsm.ticket_id = %s
        LIMIT 1
    """, (ticket_id,))
    svc = cur.fetchone()

    access_token = _get_bot_token()
    if not access_token:
        print("[bitrix-bot] Failed to get access token for assignment notification")
        return

    priority = row.get('priority_name') or 'Не указан'
    description = (row.get('description') or '')[:200]
    if len(row.get('description') or '') > 200:
        description += '...'

    service_line = ''
    if svc:
        parts = []
        if svc.get('ticket_service_name'):
            parts.append(svc['ticket_service_name'])
        if svc.get('service_name'):
            parts.append(svc['service_name'])
        if parts:
            service_line = f"\n[b]Услуга:[/b] {' → '.join(parts)}"

    message = (
        f"[b]📋 Вам назначена заявка #{row['id']}[/b]\n"
        f"{row['title']}\n\n"
        f"[b]Приоритет:[/b] {priority}"
        f"{service_line}\n\n"
        f"{description}"
    )

    keyboard = []
    if app_origin:
        ticket_url = f"{app_origin}/tickets/{row['id']}"
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

    _send_bot_message(access_token, row['executor_bitrix_id'], message, keyboard)
    print(f"[bitrix-bot] Assignment notification sent for ticket {ticket_id} to user {assigned_to_user_id}")
