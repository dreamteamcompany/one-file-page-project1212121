"""
API для управления подразделениями с древовидной структурой.
DELETE — физическое удаление с каскадом дочерних.
PATCH — деактивация/активация с каскадом дочерних.
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from utils import json_dumps


DSN = os.environ.get('DATABASE_URL')
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id',
}


def make_response(status_code, body=None):
    headers = {'Content-Type': 'application/json', **CORS_HEADERS}
    if body is None:
        return {'statusCode': status_code, 'headers': CORS_HEADERS, 'body': '', 'isBase64Encoded': False}
    serialized = json_dumps(body) if isinstance(body, (dict, list)) else json.dumps(body)
    return {'statusCode': status_code, 'headers': headers, 'body': serialized, 'isBase64Encoded': False}


def get_descendant_ids(cur, dept_id):
    cur.execute(
        """
        WITH RECURSIVE descendants AS (
            SELECT id FROM departments WHERE id = %s
            UNION ALL
            SELECT d.id FROM departments d
            JOIN descendants ds ON d.parent_id = ds.id
        )
        SELECT id FROM descendants
        """,
        (dept_id,)
    )
    return [row['id'] for row in cur.fetchall()]


def handle_get(cur, query_params):
    dept_id = query_params.get('id')
    include_inactive = query_params.get('include_inactive') == 'true'

    if dept_id:
        cur.execute('SELECT * FROM departments WHERE id = %s', (dept_id,))
        dept = cur.fetchone()
        if not dept:
            return make_response(404, {'error': 'Department not found'})
        return make_response(200, dict(dept))

    if include_inactive:
        cur.execute('SELECT * FROM departments ORDER BY company_id, name')
    else:
        cur.execute('SELECT * FROM departments WHERE is_active = true ORDER BY company_id, name')
    return make_response(200, [dict(row) for row in cur.fetchall()])


def handle_post(cur, conn, data):
    cur.execute(
        """
        INSERT INTO departments (company_id, parent_id, name, code, description)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
        """,
        (data.get('company_id'), data.get('parent_id'), data.get('name'), data.get('code'), data.get('description'))
    )
    dept = dict(cur.fetchone())

    if data.get('position_ids'):
        for pos_id in data['position_ids']:
            cur.execute('INSERT INTO department_positions (department_id, position_id) VALUES (%s, %s)', (dept['id'], pos_id))

    conn.commit()
    return make_response(201, dept)


def handle_put(cur, conn, dept_id, data):
    if not dept_id:
        return make_response(400, {'error': 'Department ID required'})

    cur.execute(
        """
        UPDATE departments
        SET company_id = %s, parent_id = %s, name = %s, code = %s, description = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING *
        """,
        (data.get('company_id'), data.get('parent_id'), data.get('name'), data.get('code'), data.get('description'), dept_id)
    )
    dept = cur.fetchone()
    if not dept:
        return make_response(404, {'error': 'Department not found'})

    if 'position_ids' in data:
        cur.execute('DELETE FROM department_positions WHERE department_id = %s', (dept_id,))
        for pos_id in data['position_ids']:
            cur.execute('INSERT INTO department_positions (department_id, position_id) VALUES (%s, %s)', (dept_id, pos_id))

    conn.commit()
    return make_response(200, dict(dept))


def handle_patch(cur, conn, dept_id, data):
    """Деактивация/активация подразделения с каскадом на дочерние."""
    if not dept_id:
        return make_response(400, {'error': 'Department ID required'})

    is_active = data.get('is_active')
    if is_active is None:
        return make_response(400, {'error': 'is_active field required'})

    cur.execute('SELECT id FROM departments WHERE id = %s', (dept_id,))
    if not cur.fetchone():
        return make_response(404, {'error': 'Department not found'})

    ids = get_descendant_ids(cur, int(dept_id))
    placeholders = ','.join(['%s'] * len(ids))
    cur.execute(
        f'UPDATE departments SET is_active = %s, updated_at = CURRENT_TIMESTAMP WHERE id IN ({placeholders})',
        [is_active] + ids
    )
    conn.commit()

    affected = len(ids)
    action_word = 'активировано' if is_active else 'деактивировано'
    return make_response(200, {'message': f'{action_word} подразделений: {affected}', 'affected_ids': ids})


def handle_delete(cur, conn, dept_id):
    """Физическое удаление подразделения и всех дочерних."""
    if not dept_id:
        return make_response(400, {'error': 'Department ID required'})

    cur.execute('SELECT id FROM departments WHERE id = %s', (dept_id,))
    if not cur.fetchone():
        return make_response(404, {'error': 'Department not found'})

    ids = get_descendant_ids(cur, int(dept_id))
    placeholders = ','.join(['%s'] * len(ids))

    cur.execute(f'DELETE FROM department_positions WHERE department_id IN ({placeholders})', ids)
    cur.execute(
        f"""
        WITH RECURSIVE ordered AS (
            SELECT id, 0 as depth FROM departments WHERE id = %s
            UNION ALL
            SELECT d.id, o.depth + 1 FROM departments d JOIN ordered o ON d.parent_id = o.id
        )
        SELECT id FROM ordered ORDER BY depth DESC
        """,
        (dept_id,)
    )
    ordered_ids = [row['id'] for row in cur.fetchall()]
    for did in ordered_ids:
        cur.execute('UPDATE departments SET parent_id = NULL WHERE id = %s', (did,))
    cur.execute(f'DELETE FROM departments WHERE id IN ({placeholders})', ids)

    conn.commit()
    return make_response(200, {'message': f'Удалено подразделений: {len(ids)}', 'deleted_ids': ids})


def handler(event: dict, context) -> dict:
    """API подразделений: GET/POST/PUT/PATCH/DELETE."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return make_response(200)

    try:
        conn = psycopg2.connect(DSN)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        query_params = event.get('queryStringParameters') or {}
        dept_id = query_params.get('id')

        if method == 'GET':
            return handle_get(cur, query_params)
        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            return handle_post(cur, conn, data)
        elif method == 'PUT':
            data = json.loads(event.get('body', '{}'))
            return handle_put(cur, conn, dept_id, data)
        elif method == 'PATCH':
            data = json.loads(event.get('body', '{}'))
            return handle_patch(cur, conn, dept_id, data)
        elif method == 'DELETE':
            return handle_delete(cur, conn, dept_id)
        else:
            return make_response(405, {'error': 'Method not allowed'})

    except Exception as e:
        import traceback
        print(f"[ERROR] {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return make_response(500, {'error': str(e)})
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()