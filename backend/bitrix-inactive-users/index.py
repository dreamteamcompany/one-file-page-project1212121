"""Получение списка пользователей Bitrix24, не заходивших более N дней"""
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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


def handler(event, context):
    """Список пользователей Битрикс24, не заходивших более N дней"""
    if event.get('httpMethod') == 'OPTIONS':
        return resp(200, {})

    payload = verify_token(event)
    if not payload:
        return resp(401, {'error': 'Требуется авторизация'})

    if event.get('httpMethod') != 'GET':
        return resp(405, {'error': 'Method not allowed'})

    qs = event.get('queryStringParameters') or {}
    days = int(qs.get('days', '30'))

    users = fetch_all_users()
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

    return resp(200, {
        'total_active_users': len(users),
        'inactive_count': len(inactive),
        'days_threshold': days,
        'users': inactive,
    })
