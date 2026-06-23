import json
from shared_utils import response, SCHEMA


ALLOWED_KEYS = {'classification_mode', 'default_executor_group_id', 'default_due_working_days'}
ALLOWED_VALUES = {'classification_mode': {'ai', 'manual'}}


def handle_system_settings(method, event, conn, payload):
    """Обработчик системных настроек (чтение и обновление)"""
    params = event.get('queryStringParameters', {}) or {}

    if method == 'GET':
        key = params.get('key')
        cur = conn.cursor()
        if key:
            if key not in ALLOWED_KEYS:
                return response(400, {'error': 'Invalid setting key'})
            cur.execute(
                "SELECT key, value, description FROM {}.system_settings WHERE key = %s".format(SCHEMA),
                (key,)
            )
            row = cur.fetchone()
            if not row:
                return response(404, {'error': 'Setting not found'})
            return response(200, dict(row))
        else:
            cur.execute("SELECT key, value, description FROM {}.system_settings ORDER BY key".format(SCHEMA))
            rows = cur.fetchall()
            return response(200, [dict(r) for r in rows])

    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        key = body.get('key')
        value = body.get('value')
        if not key or value is None:
            return response(400, {'error': 'key and value are required'})

        if key not in ALLOWED_KEYS:
            return response(400, {'error': 'Invalid setting key'})

        if key in ALLOWED_VALUES and value not in ALLOWED_VALUES[key]:
            return response(400, {'error': f'Invalid value for {key}'})

        if key == 'default_due_working_days':
            if not str(value).strip().isdigit() or not (1 <= int(str(value).strip()) <= 30):
                return response(400, {'error': 'default_due_working_days must be an integer between 1 and 30'})
            value = str(int(str(value).strip()))

        cur = conn.cursor()
        cur.execute(
            (
                "INSERT INTO {}.system_settings (key, value, updated_at) "
                "VALUES (%s, %s, NOW()) "
                "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            ).format(SCHEMA),
            (key, value)
        )
        conn.commit()
        return response(200, {'success': True, 'key': key, 'value': value})

    return response(405, {'error': 'Method not allowed'})