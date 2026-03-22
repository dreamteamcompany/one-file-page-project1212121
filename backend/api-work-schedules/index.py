"""API для управления графиками работы исполнителей"""
import json
from shared_utils import response, get_db_connection, verify_token, handle_options, safe_int, get_query_param, SCHEMA


def handler(event, context):
    """API эндпоинт для графиков работы"""
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    method = event.get('httpMethod', 'GET')

    conn = get_db_connection()
    try:
        if method == 'GET':
            return handle_get(conn, event)
        elif method == 'POST':
            return handle_post(conn, event)
        elif method == 'PUT':
            return handle_put(conn, event)
        elif method == 'DELETE':
            return handle_delete(conn, event)
        return response(405, {'error': 'Method not allowed'})
    except Exception as e:
        return response(500, {'error': str(e)})
    finally:
        try:
            conn.close()
        except:
            pass


def handle_get(conn, event):
    user_id = get_query_param(event, 'user_id')
    cur = conn.cursor()

    if user_id:
        cur.execute(f"""
            SELECT id, user_id, day_of_week, start_time, end_time, is_active, created_at, updated_at
            FROM {SCHEMA}.work_schedules
            WHERE user_id = %s
            ORDER BY day_of_week
        """, (user_id,))
        schedules = [dict(row) for row in cur.fetchall()]
        cur.close()
        return response(200, schedules)

    cur.execute(f"""
        SELECT ws.id, ws.user_id, u.full_name as user_name, u.email as user_email,
               ws.day_of_week, ws.start_time, ws.end_time, ws.is_active
        FROM {SCHEMA}.work_schedules ws
        JOIN {SCHEMA}.users u ON u.id = ws.user_id
        ORDER BY u.full_name, ws.day_of_week
    """)
    schedules = [dict(row) for row in cur.fetchall()]
    cur.close()

    users_map = {}
    for row in schedules:
        uid = row['user_id']
        if uid not in users_map:
            users_map[uid] = {
                'user_id': uid,
                'user_name': row['user_name'],
                'user_email': row['user_email'],
                'schedules': []
            }
        users_map[uid]['schedules'].append({
            'id': row['id'],
            'day_of_week': row['day_of_week'],
            'start_time': row['start_time'],
            'end_time': row['end_time'],
            'is_active': row['is_active'],
        })

    cur2 = conn.cursor()
    cur2.execute(f"SELECT id, full_name, email FROM {SCHEMA}.users WHERE is_active = true ORDER BY full_name")
    all_users = [dict(r) for r in cur2.fetchall()]
    cur2.close()

    return response(200, {
        'users_with_schedules': list(users_map.values()),
        'all_users': all_users,
    })


def handle_post(conn, event):
    body = json.loads(event.get('body', '{}'))
    user_id = safe_int(body.get('user_id'))
    schedules = body.get('schedules', [])

    if not user_id:
        return response(400, {'error': 'user_id обязателен'})
    if not schedules:
        return response(400, {'error': 'schedules обязателен'})

    cur = conn.cursor()

    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = %s AND is_active = true", (user_id,))
    if not cur.fetchone():
        cur.close()
        return response(404, {'error': 'Пользователь не найден'})

    cur.execute(f"DELETE FROM {SCHEMA}.work_schedules WHERE user_id = %s", (user_id,))

    for s in schedules:
        day = safe_int(s.get('day_of_week'))
        start_time = s.get('start_time')
        end_time = s.get('end_time')
        is_active = s.get('is_active', True)

        if day is None or day < 0 or day > 6:
            continue
        if not start_time or not end_time:
            continue

        cur.execute(f"""
            INSERT INTO {SCHEMA}.work_schedules (user_id, day_of_week, start_time, end_time, is_active)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id, day_of_week) DO UPDATE
            SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
                is_active = EXCLUDED.is_active, updated_at = NOW()
        """, (user_id, day, start_time, end_time, is_active))

    conn.commit()
    cur.close()
    return response(200, {'message': 'График сохранён'})


def handle_put(conn, event):
    return handle_post(conn, event)


def handle_delete(conn, event):
    user_id = get_query_param(event, 'user_id')
    if not user_id:
        return response(400, {'error': 'user_id обязателен'})

    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.work_schedules WHERE user_id = %s", (user_id,))
    conn.commit()
    cur.close()
    return response(200, {'message': 'График удалён'})
