"""Получение списка и деактивация пользователей Bitrix24, не заходивших более N дней"""
import json
import os
import jwt
import requests
from datetime import datetime, timedelta, timezone

JWT_SECRET = os.environ.get('JWT_SECRET')
BITRIX_WEBHOOK_URL = os.environ.get('BITRIX24_WEBHOOK_URL', '').rstrip('/')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, Authorization',
    'Access-Control-Max-Age': '86400',
}


def resp(status_code, body):
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, ensure_ascii=False, default=str),
        'isBase64Encoded': False,
    }


def verify_token(event):
    headers = event.get('headers', {})
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def fetch_all_users():
    if not BITRIX_WEBHOOK_URL:
        raise ValueError('BITRIX24_WEBHOOK_URL не настроен')

    all_users = []
    start = 0

    while True:
        r = requests.post(
            f"{BITRIX_WEBHOOK_URL}/user.get",
            json={'ACTIVE': True, 'start': start},
            headers={'Content-Type': 'application/json'},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()

        users = data.get('result', [])
        if not users:
            break

        all_users.extend(users)

        next_offset = data.get('next')
        if not next_offset:
            break
        start = next_offset

    return all_users


def deactivate_user(user_id):
    r = requests.post(
        f"{BITRIX_WEBHOOK_URL}/user.update",
        json={'ID': user_id, 'ACTIVE': False},
        headers={'Content-Type': 'application/json'},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def classify_users(users, days):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    inactive = []

    for u in users:
        last_login = u.get('LAST_LOGIN') or u.get('LAST_ACTIVITY_DATE')
        name = f"{u.get('NAME', '')} {u.get('LAST_NAME', '')}".strip()
        user_info = {
            'id': u.get('ID'),
            'name': name,
            'email': u.get('EMAIL', ''),
            'department': u.get('UF_DEPARTMENT', []),
            'position': u.get('WORK_POSITION', ''),
            'last_login': last_login,
            'days_inactive': None,
        }

        if not last_login:
            inactive.append(user_info)
            continue

        try:
            clean = last_login.replace('T', ' ').split('+')[0].split('.')[0]
            login_dt = datetime.strptime(clean, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            inactive.append(user_info)
            continue

        if login_dt < cutoff:
            user_info['days_inactive'] = (datetime.now(timezone.utc) - login_dt).days
            inactive.append(user_info)

    inactive.sort(key=lambda x: (x['days_inactive'] is None, -(x['days_inactive'] or 0)))
    return inactive


def handler(event, context):
    """Список и массовая деактивация пользователей Битрикс24"""
    if event.get('httpMethod') == 'OPTIONS':
        return resp(200, {})

    payload = verify_token(event)
    if not payload:
        return resp(401, {'error': 'Требуется авторизация'})

    method = event.get('httpMethod', 'GET')

    if method == 'GET':
        qs = event.get('queryStringParameters') or {}
        days = int(qs.get('days', '30'))

        users = fetch_all_users()
        inactive = classify_users(users, days)

        return resp(200, {
            'total_active_users': len(users),
            'inactive_count': len(inactive),
            'days_threshold': days,
            'users': inactive,
        })

    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        mode = body.get('mode')
        user_ids = body.get('user_ids', [])

        if mode == 'by_ids' and user_ids:
            targets = user_ids
        elif mode in ('all', 'never_logged', 'long_inactive'):
            days = int(body.get('days', 30))
            users = fetch_all_users()
            inactive = classify_users(users, days)

            if mode == 'all':
                targets = [u['id'] for u in inactive]
            elif mode == 'never_logged':
                targets = [u['id'] for u in inactive if u['days_inactive'] is None]
            elif mode == 'long_inactive':
                targets = [u['id'] for u in inactive if u['days_inactive'] is not None]
            else:
                targets = []
        else:
            return resp(400, {'error': 'Укажите mode: all, never_logged, long_inactive или by_ids'})

        if not targets:
            return resp(200, {'deactivated': 0, 'errors': []})

        deactivated = 0
        errors = []
        for uid in targets:
            try:
                result = deactivate_user(uid)
                if result.get('result'):
                    deactivated += 1
                else:
                    errors.append({'id': uid, 'error': str(result)})
            except BaseException as e:
                errors.append({'id': uid, 'error': str(e)})

        return resp(200, {
            'deactivated': deactivated,
            'total_requested': len(targets),
            'errors': errors[:20],
        })

    return resp(405, {'error': 'Method not allowed'})