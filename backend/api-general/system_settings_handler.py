import json
import sys
from shared_utils import response, SCHEMA


def _log(msg):
    print(msg, file=sys.stderr, flush=True)


ALLOWED_KEYS = {'classification_mode', 'default_executor_group_id'}
ALLOWED_VALUES = {'classification_mode': {'ai', 'manual'}}


def handle_system_settings(method, event, conn, payload):
    """Обработчик системных настроек (чтение и обновление)"""
    params = event.get('queryStringParameters', {}) or {}
    _log(f"[system_settings] method={method} body={event.get('body')!r} isB64={event.get('isBase64Encoded')}")

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
            _log(f"[system_settings] REJECT key={key!r} not in ALLOWED_KEYS={ALLOWED_KEYS}")
            return response(400, {'error': 'Invalid setting key'})

        if key in ALLOWED_VALUES and value not in ALLOWED_VALUES[key]:
            return response(400, {'error': f'Invalid value for {key}'})

        cur = conn.cursor()
        cur.execute(
            "UPDATE {}.system_settings SET value = %s, updated_at = NOW() WHERE key = %s".format(SCHEMA),
            (value, key)
        )
        if cur.rowcount == 0:
            cur.execute(
                "INSERT INTO {}.system_settings (key, value) VALUES (%s, %s)".format(SCHEMA),
                (key, value)
            )
        conn.commit()
        _log(f"[system_settings] saved key={key} value={value!r}")
        return response(200, {'success': True, 'key': key, 'value': value})

    return response(405, {'error': 'Method not allowed'})