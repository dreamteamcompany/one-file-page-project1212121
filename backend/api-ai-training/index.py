"""API для управления обучением AI — примеры заявок и правила классификации"""
import json
from shared_utils import response, get_db_connection, verify_token, handle_options, get_query_param, SCHEMA


def handler(event, context):
    """CRUD для примеров и правил обучения AI-классификатора"""
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    method = event.get('httpMethod', 'GET')
    endpoint = get_query_param(event, 'endpoint', '')

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        if endpoint == 'examples':
            return handle_examples(method, event, cur, conn)
        elif endpoint == 'rules':
            return handle_rules(method, event, cur, conn)
        elif endpoint == 'stats':
            return handle_stats(cur)
        elif endpoint == 'logs':
            return handle_logs(method, event, cur)
        else:
            return response(400, {'error': 'Укажите endpoint: examples, rules, stats или logs'})
    finally:
        cur.close()
        conn.close()


def handle_examples(method, event, cur, conn):
    if method == 'GET':
        cur.execute(f"""
            SELECT e.id, e.description, e.ticket_service_id, e.service_ids,
                   e.created_at, e.updated_at,
                   ts.name as ticket_service_name
            FROM {SCHEMA}.ai_training_examples e
            LEFT JOIN {SCHEMA}.ticket_services ts ON ts.id = e.ticket_service_id
            ORDER BY e.created_at DESC
        """)
        examples = [dict(r) for r in cur.fetchall()]

        svc_ids = set()
        for ex in examples:
            if ex['service_ids']:
                svc_ids.update(ex['service_ids'])

        service_names = {}
        if svc_ids:
            ids_str = ','.join(str(i) for i in svc_ids)
            cur.execute(f"SELECT id, name FROM {SCHEMA}.services WHERE id IN ({ids_str})")
            for r in cur.fetchall():
                service_names[r['id']] = r['name']

        for ex in examples:
            ex['service_names'] = [service_names.get(sid, '') for sid in (ex['service_ids'] or [])]

        return response(200, examples)

    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        description = body.get('description', '').strip()
        ticket_service_id = body.get('ticket_service_id')
        service_ids = body.get('service_ids', [])

        if not description or not ticket_service_id:
            return response(400, {'error': 'description и ticket_service_id обязательны'})

        cur.execute(f"""
            INSERT INTO {SCHEMA}.ai_training_examples (description, ticket_service_id, service_ids)
            VALUES (%s, %s, %s)
            RETURNING id, description, ticket_service_id, service_ids, created_at
        """, (description, ticket_service_id, service_ids))
        conn.commit()
        return response(201, dict(cur.fetchone()))

    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        example_id = body.get('id')
        if not example_id:
            return response(400, {'error': 'id обязателен'})

        fields = []
        values = []
        if 'description' in body:
            fields.append('description = %s')
            values.append(body['description'].strip())
        if 'ticket_service_id' in body:
            fields.append('ticket_service_id = %s')
            values.append(body['ticket_service_id'])
        if 'service_ids' in body:
            fields.append('service_ids = %s')
            values.append(body['service_ids'])

        if not fields:
            return response(400, {'error': 'Нет полей для обновления'})

        fields.append('updated_at = NOW()')
        values.append(example_id)

        cur.execute(f"""
            UPDATE {SCHEMA}.ai_training_examples
            SET {', '.join(fields)}
            WHERE id = %s
            RETURNING id, description, ticket_service_id, service_ids, updated_at
        """, values)
        conn.commit()
        row = cur.fetchone()
        if not row:
            return response(404, {'error': 'Пример не найден'})
        return response(200, dict(row))

    elif method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        example_id = body.get('id')
        if not example_id:
            return response(400, {'error': 'id обязателен'})

        cur.execute(f"DELETE FROM {SCHEMA}.ai_training_examples WHERE id = %s RETURNING id", (example_id,))
        conn.commit()
        row = cur.fetchone()
        if not row:
            return response(404, {'error': 'Пример не найден'})
        return response(200, {'deleted': True, 'id': row['id']})

    return response(405, {'error': 'Method not allowed'})


def handle_rules(method, event, cur, conn):
    if method == 'GET':
        cur.execute(f"""
            SELECT id, rule_text, is_active, created_at, updated_at
            FROM {SCHEMA}.ai_training_rules
            ORDER BY created_at DESC
        """)
        return response(200, [dict(r) for r in cur.fetchall()])

    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        rule_text = body.get('rule_text', '').strip()

        if not rule_text:
            return response(400, {'error': 'rule_text обязателен'})

        cur.execute(f"""
            INSERT INTO {SCHEMA}.ai_training_rules (rule_text, is_active)
            VALUES (%s, %s)
            RETURNING id, rule_text, is_active, created_at
        """, (rule_text, body.get('is_active', True)))
        conn.commit()
        return response(201, dict(cur.fetchone()))

    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        rule_id = body.get('id')
        if not rule_id:
            return response(400, {'error': 'id обязателен'})

        fields = []
        values = []
        if 'rule_text' in body:
            fields.append('rule_text = %s')
            values.append(body['rule_text'].strip())
        if 'is_active' in body:
            fields.append('is_active = %s')
            values.append(body['is_active'])

        if not fields:
            return response(400, {'error': 'Нет полей для обновления'})

        fields.append('updated_at = NOW()')
        values.append(rule_id)

        cur.execute(f"""
            UPDATE {SCHEMA}.ai_training_rules
            SET {', '.join(fields)}
            WHERE id = %s
            RETURNING id, rule_text, is_active, updated_at
        """, values)
        conn.commit()
        row = cur.fetchone()
        if not row:
            return response(404, {'error': 'Правило не найдено'})
        return response(200, dict(row))

    elif method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        rule_id = body.get('id')
        if not rule_id:
            return response(400, {'error': 'id обязателен'})

        cur.execute(f"DELETE FROM {SCHEMA}.ai_training_rules WHERE id = %s RETURNING id", (rule_id,))
        conn.commit()
        row = cur.fetchone()
        if not row:
            return response(404, {'error': 'Правило не найдено'})
        return response(200, {'deleted': True, 'id': row['id']})

    return response(405, {'error': 'Method not allowed'})


def handle_stats(cur):
    cur.execute(f"SELECT COUNT(*) as count FROM {SCHEMA}.ai_training_examples")
    examples_count = cur.fetchone()['count']

    cur.execute(f"SELECT COUNT(*) as count FROM {SCHEMA}.ai_training_rules WHERE is_active = true")
    rules_count = cur.fetchone()['count']

    return response(200, {
        'examples_count': examples_count,
        'active_rules_count': rules_count,
    })


def handle_logs(method, event, cur):
    if method != 'GET':
        return response(405, {'error': 'Method not allowed'})

    limit = int(get_query_param(event, 'limit', '50'))
    offset = int(get_query_param(event, 'offset', '0'))
    success_filter = get_query_param(event, 'success', '')

    where = ''
    if success_filter == 'true':
        where = 'WHERE success = true'
    elif success_filter == 'false':
        where = 'WHERE success = false'

    cur.execute(f"""
        SELECT id, description, ticket_service_id, ticket_service_name,
               service_ids, service_names, confidence, success, error_message,
               raw_response, examples_used, rules_used, duration_ms,
               test_mode, created_at
        FROM {SCHEMA}.ai_classification_logs
        {where}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """, (limit, offset))
    logs = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT COUNT(*) as total FROM {SCHEMA}.ai_classification_logs {where}")
    total = cur.fetchone()['total']

    cur.execute(f"SELECT COUNT(*) as c FROM {SCHEMA}.ai_classification_logs WHERE success = true")
    success_count = cur.fetchone()['c']

    cur.execute(f"SELECT COUNT(*) as c FROM {SCHEMA}.ai_classification_logs WHERE success = false")
    fail_count = cur.fetchone()['c']

    cur.execute(f"SELECT COALESCE(AVG(confidence), 0) as avg FROM {SCHEMA}.ai_classification_logs WHERE success = true AND confidence IS NOT NULL")
    avg_confidence = round(cur.fetchone()['avg'])

    return response(200, {
        'logs': logs,
        'total': total,
        'success_count': success_count,
        'fail_count': fail_count,
        'avg_confidence': avg_confidence,
    })