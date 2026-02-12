"""
API для управления группами дополнительных полей заявок
Поддерживает CRUD операции для групп полей и их связей
"""
import json
from shared_utils import get_db_connection, cors_headers


def handler(event: dict, context) -> dict:
    """Обработчик API для групп полей"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                **cors_headers,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if method == 'GET':
            result = handle_get(cur)
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            result = handle_post(cur, conn, body)
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            result = handle_put(cur, conn, body)
        elif method == 'DELETE':
            body = json.loads(event.get('body', '{}'))
            result = handle_delete(cur, conn, body)
        else:
            result = {'error': 'Method not allowed'}, 405
        
        cur.close()
        conn.close()
        
        if isinstance(result, tuple):
            data, status = result
        else:
            data, status = result, 200
        
        return {
            'statusCode': status,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=str),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)}, ensure_ascii=False),
            'isBase64Encoded': False
        }


def handle_get(cur):
    """Получить все группы полей с их полями"""
    cur.execute("""
        SELECT 
            g.id, g.name, g.description, g.created_at, g.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', f.id,
                        'name', f.name,
                        'field_type', f.field_type,
                        'is_required', f.is_required,
                        'options', f.options
                    ) ORDER BY gf.id
                ) FILTER (WHERE f.id IS NOT NULL),
                '[]'
            ) as fields
        FROM ticket_custom_field_groups g
        LEFT JOIN ticket_custom_field_group_fields gf ON g.id = gf.group_id
        LEFT JOIN ticket_custom_fields f ON gf.field_id = f.id
        GROUP BY g.id, g.name, g.description, g.created_at, g.updated_at
        ORDER BY g.id DESC
    """)
    
    groups = []
    for row in cur.fetchall():
        groups.append({
            'id': row[0],
            'name': row[1],
            'description': row[2],
            'created_at': row[3],
            'updated_at': row[4],
            'fields': row[5]
        })
    
    return groups


def handle_post(cur, conn, body):
    """Создать новую группу полей"""
    name = body.get('name')
    description = body.get('description', '')
    field_ids = body.get('field_ids', [])
    
    if not name:
        return {'error': 'Name is required'}, 400
    
    # Создаем группу
    cur.execute(
        "INSERT INTO ticket_custom_field_groups (name, description) VALUES (%s, %s) RETURNING id",
        (name, description)
    )
    group_id = cur.fetchone()[0]
    
    # Добавляем поля в группу
    for field_id in field_ids:
        cur.execute(
            "INSERT INTO ticket_custom_field_group_fields (group_id, field_id) VALUES (%s, %s)",
            (group_id, field_id)
        )
    
    conn.commit()
    return {'id': group_id, 'message': 'Group created successfully'}


def handle_put(cur, conn, body):
    """Обновить группу полей"""
    group_id = body.get('id')
    name = body.get('name')
    description = body.get('description', '')
    field_ids = body.get('field_ids', [])
    
    if not group_id or not name:
        return {'error': 'ID and name are required'}, 400
    
    # Обновляем группу
    cur.execute(
        "UPDATE ticket_custom_field_groups SET name = %s, description = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (name, description, group_id)
    )
    
    # Удаляем старые связи
    cur.execute("DELETE FROM ticket_custom_field_group_fields WHERE group_id = %s", (group_id,))
    
    # Добавляем новые связи
    for field_id in field_ids:
        cur.execute(
            "INSERT INTO ticket_custom_field_group_fields (group_id, field_id) VALUES (%s, %s)",
            (group_id, field_id)
        )
    
    conn.commit()
    return {'message': 'Group updated successfully'}


def handle_delete(cur, conn, body):
    """Удалить группу полей"""
    group_id = body.get('id')
    
    if not group_id:
        return {'error': 'ID is required'}, 400
    
    # Удаляем группу (связи удалятся автоматически через CASCADE)
    cur.execute("DELETE FROM ticket_custom_field_groups WHERE id = %s", (group_id,))
    conn.commit()
    
    return {'message': 'Group deleted successfully'}