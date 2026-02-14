"""
API для управления группами исполнителей.
CRUD групп, участников и привязок к комбинациям услуга+сервис.
"""
import json
from shared_utils import response, get_db_connection, verify_token, handle_options, safe_int, get_query_param, SCHEMA


def handler(event, context):
    """API эндпоинт для групп исполнителей"""
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    method = event.get('httpMethod', 'GET')
    action = get_query_param(event, 'action', '')

    try:
        conn = get_db_connection()
    except Exception:
        return response(500, {'error': 'Database connection failed'})

    try:
        if method == 'GET':
            return handle_get(conn, event, action)
        elif method == 'POST':
            return handle_post(conn, event, action)
        elif method == 'PUT':
            return handle_put(conn, event)
        elif method == 'DELETE':
            return handle_remove(conn, event, action)
        return response(405, {'error': 'Method not allowed'})
    except Exception as e:
        return response(500, {'error': str(e)})
    finally:
        try:
            conn.close()
        except:
            pass


def handle_get(conn, event, action):
    group_id = get_query_param(event, 'id')

    if action == 'members' and group_id:
        return get_group_members(conn, group_id)
    if action == 'mappings' and group_id:
        return get_group_mappings(conn, group_id)
    if action == 'reference':
        return get_reference_data(conn)
    if group_id:
        return get_group_by_id(conn, group_id)
    return get_all_groups(conn)


def handle_post(conn, event, action):
    body = json.loads(event.get('body', '{}'))
    if action == 'members':
        return add_member(conn, body)
    if action == 'mappings':
        return add_mapping(conn, body)
    return create_group(conn, body)


def handle_put(conn, event):
    body = json.loads(event.get('body', '{}'))
    return update_group(conn, body)


def handle_remove(conn, event, action):
    if action == 'members':
        member_id = get_query_param(event, 'member_id')
        return remove_member(conn, member_id)
    if action == 'mappings':
        mapping_id = get_query_param(event, 'mapping_id')
        return remove_mapping(conn, mapping_id)
    group_id = get_query_param(event, 'id')
    return remove_group(conn, group_id)


def get_all_groups(conn):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT 
            g.id, g.name, g.description, g.is_active,
            g.auto_assign, g.assign_group_only,
            g.created_at, g.updated_at,
            COALESCE(mc.member_count, 0) as member_count,
            COALESCE(sc.mapping_count, 0) as mapping_count
        FROM {SCHEMA}.executor_groups g
        LEFT JOIN (
            SELECT group_id, COUNT(*) as member_count
            FROM {SCHEMA}.executor_group_members
            GROUP BY group_id
        ) mc ON mc.group_id = g.id
        LEFT JOIN (
            SELECT group_id, COUNT(*) as mapping_count
            FROM {SCHEMA}.executor_group_service_mappings
            GROUP BY group_id
        ) sc ON sc.group_id = g.id
        ORDER BY g.name
    """)
    groups = [dict(row) for row in cur.fetchall()]
    cur.close()
    return response(200, groups)


def get_group_by_id(conn, group_id):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT id, name, description, is_active, auto_assign, assign_group_only, created_at, updated_at
        FROM {SCHEMA}.executor_groups WHERE id = %s
    """, (group_id,))
    group = cur.fetchone()
    cur.close()
    if not group:
        return response(404, {'error': 'Группа не найдена'})
    return response(200, dict(group))


def get_group_members(conn, group_id):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT 
            m.id, m.group_id, m.user_id, m.is_lead, m.created_at,
            u.full_name as user_name, u.email as user_email
        FROM {SCHEMA}.executor_group_members m
        JOIN {SCHEMA}.users u ON u.id = m.user_id
        WHERE m.group_id = %s
        ORDER BY m.is_lead DESC, u.full_name
    """, (group_id,))
    members = [dict(row) for row in cur.fetchall()]
    cur.close()
    return response(200, members)


def get_group_mappings(conn, group_id):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT 
            m.id, m.group_id, 
            m.ticket_service_id, ts.name as ticket_service_name,
            m.service_id, s.name as service_name,
            m.created_at
        FROM {SCHEMA}.executor_group_service_mappings m
        JOIN {SCHEMA}.ticket_services ts ON ts.id = m.ticket_service_id
        JOIN {SCHEMA}.services s ON s.id = m.service_id
        WHERE m.group_id = %s
        ORDER BY ts.name, s.name
    """, (group_id,))
    mappings = [dict(row) for row in cur.fetchall()]
    cur.close()
    return response(200, mappings)


def get_reference_data(conn):
    cur = conn.cursor()
    cur.execute(f"SELECT id, full_name, email FROM {SCHEMA}.users WHERE is_active = true ORDER BY full_name")
    users = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.ticket_services WHERE is_active = true ORDER BY name")
    ticket_services = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.services ORDER BY name")
    services = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT tsm.ticket_service_id, tsm.service_id
        FROM {SCHEMA}.ticket_service_mappings tsm
        ORDER BY tsm.ticket_service_id, tsm.service_id
    """)
    valid_combos = [dict(r) for r in cur.fetchall()]

    cur.close()
    return response(200, {
        'users': users,
        'ticket_services': ticket_services,
        'services': services,
        'valid_combos': valid_combos,
    })


def create_group(conn, body):
    name = body.get('name', '').strip()
    if not name:
        return response(400, {'error': 'Название группы обязательно'})

    description = body.get('description', '')
    auto_assign = body.get('auto_assign', False)
    assign_group_only = body.get('assign_group_only', False)
    cur = conn.cursor()
    cur.execute(f"""
        INSERT INTO {SCHEMA}.executor_groups (name, description, auto_assign, assign_group_only)
        VALUES (%s, %s, %s, %s)
        RETURNING id, name, description, is_active, auto_assign, assign_group_only, created_at, updated_at
    """, (name, description, auto_assign, assign_group_only))
    group = dict(cur.fetchone())
    conn.commit()
    cur.close()
    return response(201, group)


def update_group(conn, body):
    group_id = body.get('id')
    if not group_id:
        return response(400, {'error': 'ID группы обязателен'})

    name = body.get('name', '').strip()
    if not name:
        return response(400, {'error': 'Название группы обязательно'})

    description = body.get('description', '')
    is_active = body.get('is_active', True)
    auto_assign = body.get('auto_assign', False)
    assign_group_only = body.get('assign_group_only', False)

    cur = conn.cursor()
    cur.execute(f"""
        UPDATE {SCHEMA}.executor_groups
        SET name = %s, description = %s, is_active = %s,
            auto_assign = %s, assign_group_only = %s, updated_at = NOW()
        WHERE id = %s
        RETURNING id, name, description, is_active, auto_assign, assign_group_only, created_at, updated_at
    """, (name, description, is_active, auto_assign, assign_group_only, group_id))
    group = cur.fetchone()
    if not group:
        cur.close()
        return response(404, {'error': 'Группа не найдена'})
    conn.commit()
    cur.close()
    return response(200, dict(group))


def add_member(conn, body):
    group_id = safe_int(body.get('group_id'))
    user_id = safe_int(body.get('user_id'))
    is_lead = body.get('is_lead', False)

    if not group_id or not user_id:
        return response(400, {'error': 'group_id и user_id обязательны'})

    cur = conn.cursor()
    cur.execute(f"""
        SELECT id FROM {SCHEMA}.executor_group_members
        WHERE group_id = %s AND user_id = %s
    """, (group_id, user_id))
    if cur.fetchone():
        cur.close()
        return response(409, {'error': 'Пользователь уже в группе'})

    cur.execute(f"""
        INSERT INTO {SCHEMA}.executor_group_members (group_id, user_id, is_lead)
        VALUES (%s, %s, %s)
        RETURNING id, group_id, user_id, is_lead, created_at
    """, (group_id, user_id, is_lead))
    member = dict(cur.fetchone())
    conn.commit()
    cur.close()
    return response(201, member)


def remove_member(conn, member_id):
    if not member_id:
        return response(400, {'error': 'member_id обязателен'})
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.executor_group_members WHERE id = %s RETURNING id", (member_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return response(404, {'error': 'Участник не найден'})
    conn.commit()
    cur.close()
    return response(200, {'message': 'Участник удалён'})


def add_mapping(conn, body):
    group_id = safe_int(body.get('group_id'))
    ticket_service_id = safe_int(body.get('ticket_service_id'))
    service_id = safe_int(body.get('service_id'))

    if not group_id or not ticket_service_id or not service_id:
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
        INSERT INTO {SCHEMA}.executor_group_service_mappings (group_id, ticket_service_id, service_id)
        VALUES (%s, %s, %s)
        RETURNING id, group_id, ticket_service_id, service_id, created_at
    """, (group_id, ticket_service_id, service_id))
    mapping = dict(cur.fetchone())
    conn.commit()
    cur.close()
    return response(201, mapping)


def remove_mapping(conn, mapping_id):
    if not mapping_id:
        return response(400, {'error': 'mapping_id обязателен'})
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.executor_group_service_mappings WHERE id = %s RETURNING id", (mapping_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return response(404, {'error': 'Привязка не найдена'})
    conn.commit()
    cur.close()
    return response(200, {'message': 'Привязка удалена'})


def remove_group(conn, group_id):
    if not group_id:
        return response(400, {'error': 'ID группы обязателен'})

    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) as cnt FROM {SCHEMA}.executor_group_members WHERE group_id = %s", (group_id,))
    row = cur.fetchone()
    if row and row['cnt'] > 0:
        cur.close()
        return response(400, {'error': f'Невозможно удалить: в группе {row["cnt"]} участников. Сначала очистите состав.'})

    cur.execute(f"DELETE FROM {SCHEMA}.executor_group_service_mappings WHERE group_id = %s", (group_id,))
    cur.execute(f"DELETE FROM {SCHEMA}.executor_groups WHERE id = %s RETURNING id", (group_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return response(404, {'error': 'Группа не найдена'})
    conn.commit()
    cur.close()
    return response(200, {'message': 'Группа удалена'})