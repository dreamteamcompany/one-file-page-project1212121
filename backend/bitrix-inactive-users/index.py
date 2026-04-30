"""Получение списка, деактивация пользователей Bitrix24 и управление исключениями"""
import json
import os
import jwt
import requests
import psycopg2
from datetime import datetime, timedelta, timezone

JWT_SECRET = os.environ.get('JWT_SECRET')
BITRIX_WEBHOOK_URL = os.environ.get('BITRIX24_WEBHOOK_URL', '').rstrip('/')
DATABASE_URL = os.environ.get('DATABASE_URL')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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


def is_admin(payload):
    if not payload:
        return False
    roles = payload.get('roles') or []
    for r in roles:
        if isinstance(r, dict):
            if r.get('system_role') == 'admin' or r.get('name') == 'admin':
                return True
        elif r == 'admin':
            return True
    system_roles = payload.get('system_roles') or []
    if 'admin' in system_roles:
        return True
    return False


def get_db():
    return psycopg2.connect(DATABASE_URL)


def fetch_exceptions():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, bitrix_user_id, full_name, email, position, reason, "
            "added_by_user_id, added_by_name, added_at "
            "FROM bitrix_block_exceptions ORDER BY added_at DESC"
        )
        rows = cur.fetchall()
        return [
            {
                'id': r[0],
                'bitrix_user_id': r[1],
                'full_name': r[2],
                'email': r[3] or '',
                'position': r[4] or '',
                'reason': r[5] or '',
                'added_by_user_id': r[6],
                'added_by_name': r[7] or '',
                'added_at': r[8].isoformat() if r[8] else None,
            }
            for r in rows
        ]
    finally:
        conn.close()


def fetch_exception_ids():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT bitrix_user_id FROM bitrix_block_exceptions")
        return {r[0] for r in cur.fetchall()}
    finally:
        conn.close()


def add_exception(bitrix_user_id, full_name, email, position, reason, added_by_user_id, added_by_name):
    conn = get_db()
    try:
        cur = conn.cursor()
        safe_id = str(bitrix_user_id).replace("'", "''")
        safe_name = (full_name or '').replace("'", "''")
        safe_email = (email or '').replace("'", "''")
        safe_position = (position or '').replace("'", "''")
        safe_reason = (reason or '').replace("'", "''")
        safe_added_by_name = (added_by_name or '').replace("'", "''")
        added_by_sql = "NULL" if added_by_user_id is None else str(int(added_by_user_id))
        cur.execute(
            f"INSERT INTO bitrix_block_exceptions "
            f"(bitrix_user_id, full_name, email, position, reason, added_by_user_id, added_by_name) "
            f"VALUES ('{safe_id}', '{safe_name}', '{safe_email}', '{safe_position}', "
            f"'{safe_reason}', {added_by_sql}, '{safe_added_by_name}') "
            f"ON CONFLICT (bitrix_user_id) DO UPDATE SET "
            f"full_name = EXCLUDED.full_name, email = EXCLUDED.email, "
            f"position = EXCLUDED.position, reason = EXCLUDED.reason"
        )
        conn.commit()
    finally:
        conn.close()


def remove_exception(bitrix_user_id):
    conn = get_db()
    try:
        cur = conn.cursor()
        safe_id = str(bitrix_user_id).replace("'", "''")
        cur.execute(f"DELETE FROM bitrix_block_exceptions WHERE bitrix_user_id = '{safe_id}'")
        conn.commit()
    finally:
        conn.close()


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


def search_bitrix_users(query):
    if not BITRIX_WEBHOOK_URL:
        raise ValueError('BITRIX24_WEBHOOK_URL не настроен')
    q = (query or '').strip()
    if not q:
        return []
    payload = {'FILTER': {'%NAME': q}}
    r = requests.post(
        f"{BITRIX_WEBHOOK_URL}/user.search",
        json=payload,
        headers={'Content-Type': 'application/json'},
        timeout=15,
    )
    if not r.ok:
        r2 = requests.post(
            f"{BITRIX_WEBHOOK_URL}/user.get",
            json={'FILTER': {'%LAST_NAME': q}},
            headers={'Content-Type': 'application/json'},
            timeout=15,
        )
        r2.raise_for_status()
        users = r2.json().get('result', [])
    else:
        users = r.json().get('result', [])

    out = []
    for u in users[:30]:
        name = f"{u.get('NAME', '')} {u.get('LAST_NAME', '')}".strip()
        out.append({
            'id': u.get('ID'),
            'name': name,
            'email': u.get('EMAIL', ''),
            'position': u.get('WORK_POSITION', ''),
        })
    return out


def deactivate_user(user_id):
    r = requests.post(
        f"{BITRIX_WEBHOOK_URL}/user.update",
        json={'ID': user_id, 'ACTIVE': False},
        headers={'Content-Type': 'application/json'},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def classify_users(users, days, exception_ids):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    inactive = []

    for u in users:
        last_login = u.get('LAST_LOGIN') or u.get('LAST_ACTIVITY_DATE')
        name = f"{u.get('NAME', '')} {u.get('LAST_NAME', '')}".strip()
        uid = str(u.get('ID'))
        user_info = {
            'id': uid,
            'name': name,
            'email': u.get('EMAIL', ''),
            'department': u.get('UF_DEPARTMENT', []),
            'position': u.get('WORK_POSITION', ''),
            'last_login': last_login,
            'days_inactive': None,
            'is_excluded': uid in exception_ids,
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
    """Список, исключения и массовая деактивация пользователей Битрикс24"""
    if event.get('httpMethod') == 'OPTIONS':
        return resp(200, {})

    payload = verify_token(event)
    if not payload:
        return resp(401, {'error': 'Требуется авторизация'})

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action')

    if method == 'GET' and action == 'exceptions':
        return resp(200, {'exceptions': fetch_exceptions()})

    if method == 'GET' and action == 'search_bitrix':
        if not is_admin(payload):
            return resp(403, {'error': 'Доступ только для администратора'})
        query = qs.get('q', '')
        try:
            users = search_bitrix_users(query)
            existing = fetch_exception_ids()
            for u in users:
                u['already_excluded'] = str(u['id']) in existing
            return resp(200, {'users': users})
        except BaseException as e:
            return resp(500, {'error': str(e)})

    if method == 'GET':
        days = int(qs.get('days', '30'))
        users = fetch_all_users()
        exception_ids = fetch_exception_ids()
        inactive = classify_users(users, days, exception_ids)

        return resp(200, {
            'total_active_users': len(users),
            'inactive_count': len(inactive),
            'days_threshold': days,
            'users': inactive,
            'exceptions_count': len(exception_ids),
        })

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        post_action = body.get('action')

        if post_action == 'add_exception':
            if not is_admin(payload):
                return resp(403, {'error': 'Доступ только для администратора'})
            bx_id = body.get('bitrix_user_id')
            if not bx_id:
                return resp(400, {'error': 'bitrix_user_id обязателен'})
            add_exception(
                bitrix_user_id=str(bx_id),
                full_name=body.get('full_name', ''),
                email=body.get('email', ''),
                position=body.get('position', ''),
                reason=body.get('reason', ''),
                added_by_user_id=payload.get('user_id') or payload.get('id'),
                added_by_name=payload.get('full_name') or payload.get('username') or '',
            )
            return resp(200, {'ok': True})

        if post_action == 'remove_exception':
            if not is_admin(payload):
                return resp(403, {'error': 'Доступ только для администратора'})
            bx_id = body.get('bitrix_user_id')
            if not bx_id:
                return resp(400, {'error': 'bitrix_user_id обязателен'})
            remove_exception(str(bx_id))
            return resp(200, {'ok': True})

        mode = body.get('mode')
        user_ids = body.get('user_ids', [])

        if mode == 'by_ids' and user_ids:
            targets = [str(x) for x in user_ids]
        elif mode in ('all', 'never_logged', 'long_inactive'):
            days = int(body.get('days', 30))
            users = fetch_all_users()
            exception_ids = fetch_exception_ids()
            inactive = classify_users(users, days, exception_ids)

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

        exception_ids = fetch_exception_ids()
        skipped = [t for t in targets if str(t) in exception_ids]
        targets = [t for t in targets if str(t) not in exception_ids]

        if not targets:
            return resp(200, {'deactivated': 0, 'errors': [], 'skipped_excluded': len(skipped)})

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
            'skipped_excluded': len(skipped),
            'errors': errors[:20],
        })

    return resp(405, {'error': 'Method not allowed'})
