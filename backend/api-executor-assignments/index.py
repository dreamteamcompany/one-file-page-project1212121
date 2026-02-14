"""
API для привязки исполнителей (групп и отдельных пользователей) к комбинациям услуга+сервис.
Позволяет просматривать все привязки, добавлять и удалять их.
"""
import json
from shared_utils import (
    response, get_db_connection, verify_token, handle_options,
    safe_int, get_query_param, SCHEMA,
)


def handler(event, context):
    """Эндпоинт привязки исполнителей к услугам и сервисам"""
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    method = event.get('httpMethod', 'GET')
    action = get_query_param(event, 'action', '')

    conn = get_db_connection()
    try:
        if method == 'GET':
            return _handle_get(conn, action)
        if method == 'POST':
            return _handle_post(conn, event, action)
        if method == 'DELETE':
            return _handle_delete(conn, event, action)
        return response(405, {'error': 'Method not allowed'})
    finally:
        conn.close()


def _handle_get(conn, action):
    if action == 'reference':
        return _get_reference(conn)
    return _get_all_assignments(conn)


def _handle_post(conn, event, action):
    body = json.loads(event.get('body', '{}'))
    if action == 'group':
        return _add_group_assignment(conn, body)
    if action == 'user':
        return _add_user_assignment(conn, body)
    return response(400, {'error': 'Укажите action: group или user'})


def _handle_delete(conn, event, action):
    item_id = safe_int(get_query_param(event, 'id'))
    if not item_id:
        return response(400, {'error': 'id обязателен'})
    if action == 'group':
        return _remove_group_assignment(conn, item_id)
    if action == 'user':
        return _remove_user_assignment(conn, item_id)
    return response(400, {'error': 'Укажите action: group или user'})


def _get_reference(conn):
    cur = conn.cursor()

    cur.execute(f"""
        SELECT id, full_name, email
        FROM {SCHEMA}.users WHERE is_active = true ORDER BY full_name
    """)
    users = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT id, name
        FROM {SCHEMA}.ticket_services WHERE is_active = true ORDER BY name
    """)
    ticket_services = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.services ORDER BY name")
    services = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT ticket_service_id, service_id
        FROM {SCHEMA}.ticket_service_mappings
        ORDER BY ticket_service_id, service_id
    """)
    valid_combos = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT id, name FROM {SCHEMA}.executor_groups
        WHERE is_active = true ORDER BY name
    """)
    groups = [dict(r) for r in cur.fetchall()]

    cur.close()
    return response(200, {
        'users': users,
        'ticket_services': ticket_services,
        'services': services,
        'valid_combos': valid_combos,
        'groups': groups,
    })


def _get_all_assignments(conn):
    cur = conn.cursor()

    cur.execute(f"""
        SELECT
            m.id, m.group_id,
            g.name AS group_name,
            m.ticket_service_id, ts.name AS ticket_service_name,
            m.service_id, s.name AS service_name,
            m.created_at
        FROM {SCHEMA}.executor_group_service_mappings m
        JOIN {SCHEMA}.executor_groups g ON g.id = m.group_id
        JOIN {SCHEMA}.ticket_services ts ON ts.id = m.ticket_service_id
        JOIN {SCHEMA}.services s ON s.id = m.service_id
        ORDER BY ts.name, s.name, g.name
    """)
    group_assignments = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT
            m.id, m.user_id,
            u.full_name AS user_name, u.email AS user_email,
            m.ticket_service_id, ts.name AS ticket_service_name,
            m.service_id, s.name AS service_name,
            m.created_at
        FROM {SCHEMA}.executor_user_service_mappings m
        JOIN {SCHEMA}.users u ON u.id = m.user_id
        JOIN {SCHEMA}.ticket_services ts ON ts.id = m.ticket_service_id
        JOIN {SCHEMA}.services s ON s.id = m.service_id
        ORDER BY ts.name, s.name, u.full_name
    """)
    user_assignments = [dict(r) for r in cur.fetchall()]

    cur.close()
    return response(200, {
        'group_assignments': group_assignments,
        'user_assignments': user_assignments,
    })


def _add_group_assignment(conn, body):
    group_id = safe_int(body.get('group_id'))
    ticket_service_id = safe_int(body.get('ticket_service_id'))
    service_id = safe_int(body.get('service_id'))

    if not all([group_id, ticket_service_id, service_id]):
        return response(400, {'error': 'group_id, ticket_service_id и service_id обязательны'})

    cur = conn.cursor()
    cur.execute(f"""
        SELECT id FROM {SCHEMA}.executor_group_service_mappings
        WHERE group_id = %s AND ticket_service_id = %s AND service_id = %s
    """, (group_id, ticket_service_id, service_id))
    if cur.fetchone():
        cur.close()
        return response(409, {'error': 'Такая привязка уже существует'})

    cur.execute(f"""
        INSERT INTO {SCHEMA}.executor_group_service_mappings
            (group_id, ticket_service_id, service_id)
        VALUES (%s, %s, %s)
        RETURNING id, group_id, ticket_service_id, service_id, created_at
    """, (group_id, ticket_service_id, service_id))
    row = dict(cur.fetchone())
    conn.commit()
    cur.close()
    return response(201, row)


def _add_user_assignment(conn, body):
    user_id = safe_int(body.get('user_id'))
    ticket_service_id = safe_int(body.get('ticket_service_id'))
    service_id = safe_int(body.get('service_id'))

    if not all([user_id, ticket_service_id, service_id]):
        return response(400, {'error': 'user_id, ticket_service_id и service_id обязательны'})

    cur = conn.cursor()
    cur.execute(f"""
        SELECT id FROM {SCHEMA}.executor_user_service_mappings
        WHERE user_id = %s AND ticket_service_id = %s AND service_id = %s
    """, (user_id, ticket_service_id, service_id))
    if cur.fetchone():
        cur.close()
        return response(409, {'error': 'Такая привязка уже существует'})

    cur.execute(f"""
        INSERT INTO {SCHEMA}.executor_user_service_mappings
            (user_id, ticket_service_id, service_id)
        VALUES (%s, %s, %s)
        RETURNING id, user_id, ticket_service_id, service_id, created_at
    """, (user_id, ticket_service_id, service_id))
    row = dict(cur.fetchone())
    conn.commit()
    cur.close()
    return response(201, row)


def _remove_group_assignment(conn, mapping_id):
    cur = conn.cursor()
    cur.execute(f"""
        DELETE FROM {SCHEMA}.executor_group_service_mappings
        WHERE id = %s RETURNING id
    """, (mapping_id,))
    if not cur.fetchone():
        cur.close()
        return response(404, {'error': 'Привязка не найдена'})
    conn.commit()
    cur.close()
    return response(200, {'message': 'Привязка группы удалена'})


def _remove_user_assignment(conn, mapping_id):
    cur = conn.cursor()
    cur.execute(f"""
        DELETE FROM {SCHEMA}.executor_user_service_mappings
        WHERE id = %s RETURNING id
    """, (mapping_id,))
    if not cur.fetchone():
        cur.close()
        return response(404, {'error': 'Привязка не найдена'})
    conn.commit()
    cur.close()
    return response(200, {'message': 'Привязка исполнителя удалена'})
