"""
API для управления связями услуга-сервис-группы полей
Определяет какие поля показывать при создании заявки
"""
import json
from shared_utils import get_db_connection, cors_headers


def handler(event: dict, context) -> dict:
    """Обработчик API для связей услуга-сервис-группы полей"""
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
    """Получить все связи"""
    cur.execute("""
        SELECT 
            m.id,
            m.ticket_service_id,
            ts.name as ticket_service_name,
            m.service_id,
            s.name as service_name,
            m.field_group_id,
            g.name as field_group_name,
            m.created_at,
            m.updated_at
        FROM ticket_service_field_mappings m
        JOIN ticket_services ts ON m.ticket_service_id = ts.id
        JOIN services s ON m.service_id = s.id
        JOIN ticket_custom_field_groups g ON m.field_group_id = g.id
        ORDER BY m.id DESC
    """)
    
    mappings = []
    for row in cur.fetchall():
        mappings.append({
            'id': row[0],
            'ticket_service_id': row[1],
            'ticket_service_name': row[2],
            'service_id': row[3],
            'service_name': row[4],
            'field_group_id': row[5],
            'field_group_name': row[6],
            'created_at': row[7],
            'updated_at': row[8]
        })
    
    return mappings


def handle_post(cur, conn, body):
    """Создать новую связь"""
    ticket_service_id = body.get('ticket_service_id')
    service_id = body.get('service_id')
    field_group_id = body.get('field_group_id')
    
    if not all([ticket_service_id, service_id, field_group_id]):
        return {'error': 'ticket_service_id, service_id and field_group_id are required'}, 400
    
    # Проверяем, нет ли дубликата
    cur.execute(
        "SELECT id FROM ticket_service_field_mappings WHERE ticket_service_id = %s AND service_id = %s AND field_group_id = %s",
        (ticket_service_id, service_id, field_group_id)
    )
    if cur.fetchone():
        return {'error': 'Mapping already exists'}, 400
    
    # Создаем связь
    cur.execute(
        "INSERT INTO ticket_service_field_mappings (ticket_service_id, service_id, field_group_id) VALUES (%s, %s, %s) RETURNING id",
        (ticket_service_id, service_id, field_group_id)
    )
    mapping_id = cur.fetchone()[0]
    
    conn.commit()
    return {'id': mapping_id, 'message': 'Mapping created successfully'}


def handle_put(cur, conn, body):
    """Обновить связь"""
    mapping_id = body.get('id')
    ticket_service_id = body.get('ticket_service_id')
    service_id = body.get('service_id')
    field_group_id = body.get('field_group_id')
    
    if not all([mapping_id, ticket_service_id, service_id, field_group_id]):
        return {'error': 'All fields are required'}, 400
    
    cur.execute(
        "UPDATE ticket_service_field_mappings SET ticket_service_id = %s, service_id = %s, field_group_id = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (ticket_service_id, service_id, field_group_id, mapping_id)
    )
    
    conn.commit()
    return {'message': 'Mapping updated successfully'}


def handle_delete(cur, conn, body):
    """Удалить связь"""
    mapping_id = body.get('id')
    
    if not mapping_id:
        return {'error': 'ID is required'}, 400
    
    cur.execute("DELETE FROM ticket_service_field_mappings WHERE id = %s", (mapping_id,))
    conn.commit()
    
    return {'message': 'Mapping deleted successfully'}