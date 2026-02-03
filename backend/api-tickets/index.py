"""
API для работы с заявками (tickets) и категориями сервисов (service_categories)
"""
import json
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from shared_utils import response, get_db_connection, verify_token, handle_options, get_endpoint, SCHEMA

class TicketRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(default='')
    status_id: int = Field(..., gt=0)
    priority_id: int = Field(..., gt=0)
    assigned_to: Optional[int] = None
    service_ids: list[int] = Field(default=[])
    custom_fields: dict = Field(default={})

class ServiceCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = Field(default='')
    icon: str = Field(default='Folder')

class CategoryRequest(BaseModel):
    name: str = Field(..., min_length=1)
    icon: str = Field(default='Tag')

def handler(event: dict, context) -> dict:
    """API для работы с заявками и категориями сервисов"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return handle_options()
    
    endpoint = get_endpoint(event)
    
    try:
        conn = get_db_connection()
    except Exception as e:
        return response(500, {'error': f'Database connection failed: {str(e)}'})
    
    try:
        if endpoint == 'tickets':
            return handle_tickets(method, event, conn)
        elif endpoint == 'service_categories':
            return handle_service_categories(method, event, conn)
        elif endpoint == 'ticket-dictionaries-api':
            return handle_ticket_dictionaries(method, event, conn)
        elif endpoint == 'ticket_services':
            return handle_ticket_services(method, event, conn)
        else:
            return response(400, {'error': 'Unknown endpoint'})
    finally:
        try:
            conn.close()
        except:
            pass

def handle_tickets(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    

    if method == 'GET':
        query_params = event.get('queryStringParameters', {})
        
        status_id = query_params.get('status_id')
        priority_id = query_params.get('priority_id')
        assigned_to = query_params.get('assigned_to')
        created_by = query_params.get('created_by')
        service_id = query_params.get('service_id')
        from_date = query_params.get('from_date')
        to_date = query_params.get('to_date')
        
        cur = conn.cursor()
        
        query = f"""
            SELECT DISTINCT t.*, 
                   s.name as status_name, s.color as status_color,
                   p.name as priority_name, p.color as priority_color,
                   u1.username as assigned_to_name,
                   u2.username as created_by_name
            FROM {SCHEMA}.tickets t
            LEFT JOIN {SCHEMA}.ticket_statuses s ON t.status_id = s.id
            LEFT JOIN {SCHEMA}.ticket_priorities p ON t.priority_id = p.id
            LEFT JOIN {SCHEMA}.users u1 ON t.assigned_to = u1.id
            LEFT JOIN {SCHEMA}.users u2 ON t.created_by = u2.id
            LEFT JOIN {SCHEMA}.ticket_to_service_mappings tsm ON t.id = tsm.ticket_id
            WHERE 1=1
        """
        
        params = []
        
        if status_id:
            query += " AND t.status_id = %s"
            params.append(int(status_id))
        
        if priority_id:
            query += " AND t.priority_id = %s"
            params.append(int(priority_id))
        
        if assigned_to:
            query += " AND t.assigned_to = %s"
            params.append(int(assigned_to))
        
        if created_by:
            query += " AND t.created_by = %s"
            params.append(int(created_by))
        
        if service_id:
            query += " AND tsm.ticket_service_id = %s"
            params.append(int(service_id))
        
        if from_date:
            query += " AND t.created_at >= %s"
            params.append(from_date)
        
        if to_date:
            query += " AND t.created_at <= %s"
            params.append(to_date)
        
        query += " ORDER BY t.created_at DESC"
        
        cur.execute(query, params)
        tickets = [dict(row) for row in cur.fetchall()]
        
        for ticket in tickets:
            cur.execute(f"""
                SELECT s.id, s.name, sc.name as category_name
                FROM {SCHEMA}.ticket_services s
                JOIN {SCHEMA}.ticket_to_service_mappings tsm ON s.id = tsm.ticket_service_id
                LEFT JOIN {SCHEMA}.ticket_service_categories sc ON s.category_id = sc.id
                WHERE tsm.ticket_id = %s
            """, (ticket['id'],))
            ticket['services'] = [dict(row) for row in cur.fetchall()]
            
            cur.execute(f"""
                SELECT cf.id, cf.name, cf.field_type, tcfv.value
                FROM {SCHEMA}.ticket_custom_field_values tcfv
                JOIN {SCHEMA}.ticket_custom_fields cf ON tcfv.field_id = cf.id
                WHERE tcfv.ticket_id = %s
            """, (ticket['id'],))
            ticket['custom_fields'] = [dict(row) for row in cur.fetchall()]
        
        cur.close()
        return response(200, {'tickets': tickets})
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        

        try:
            data = TicketRequest(**body)
        except Exception as e:
            return response(400, {'error': f'Validation error: {str(e)}'})
        
        cur = conn.cursor()
        
        cur.execute(f"""
            INSERT INTO {SCHEMA}.tickets 
            (title, description, status_id, priority_id, assigned_to, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, title, description, status_id, priority_id, assigned_to, created_by, created_at, updated_at
        """, (
            data.title,
            data.description,
            data.status_id,
            data.priority_id,
            data.assigned_to,
            payload['user_id']
        ))
        
        ticket = dict(cur.fetchone())
        
        for service_id in data.service_ids:
            cur.execute(f"""
                INSERT INTO {SCHEMA}.ticket_to_service_mappings (ticket_id, ticket_service_id)
                VALUES (%s, %s)
            """, (ticket['id'], service_id))
        
        for field_id, value in data.custom_fields.items():
            cur.execute(f"""
                INSERT INTO {SCHEMA}.ticket_custom_field_values (ticket_id, field_id, value)
                VALUES (%s, %s, %s)
            """, (ticket['id'], int(field_id), value))
        
        conn.commit()
        cur.close()
        
        return response(201, ticket)
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        ticket_id = body.get('id')
        if not ticket_id:
            return response(400, {'error': 'Ticket ID required'})
        
        cur = conn.cursor()
        
        update_fields = []
        params = []
        
        if 'title' in body:
            update_fields.append("title = %s")
            params.append(body['title'])
        
        if 'description' in body:
            update_fields.append("description = %s")
            params.append(body['description'])
        
        if 'status_id' in body:
            update_fields.append("status_id = %s")
            params.append(body['status_id'])
        
        if 'priority_id' in body:
            update_fields.append("priority_id = %s")
            params.append(body['priority_id'])
        
        if 'assigned_to' in body:
            update_fields.append("assigned_to = %s")
            params.append(body['assigned_to'])
        
        update_fields.append("updated_at = NOW()")
        params.append(ticket_id)
        
        cur.execute(f"""
            UPDATE {SCHEMA}.tickets 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, title, description, status_id, priority_id, assigned_to, created_by, created_at, updated_at
        """, params)
        
        ticket = dict(cur.fetchone())
        
        if 'service_ids' in body:
            cur.execute(f"DELETE FROM {SCHEMA}.ticket_to_service_mappings WHERE ticket_id = %s", (ticket_id,))
            for service_id in body['service_ids']:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.ticket_to_service_mappings (ticket_id, ticket_service_id)
                    VALUES (%s, %s)
                """, (ticket_id, service_id))
        
        if 'custom_fields' in body:
            cur.execute("DELETE FROM ticket_custom_field_values WHERE ticket_id = %s", (ticket_id,))
            for field_id, value in body['custom_fields'].items():
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.ticket_custom_field_values (ticket_id, field_id, value)
                    VALUES (%s, %s, %s)
                """, (ticket_id, int(field_id), value))
        
        conn.commit()
        cur.close()
        
        return response(200, ticket)
    
    elif method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        ticket_id = body.get('id')
        if not ticket_id:
            return response(400, {'error': 'Ticket ID required'})
        
        cur = conn.cursor()
        
        cur.execute(f"DELETE FROM {SCHEMA}.ticket_to_service_mappings WHERE ticket_id = %s", (ticket_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.ticket_custom_field_values WHERE ticket_id = %s", (ticket_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.tickets WHERE id = %s", (ticket_id,))
        
        conn.commit()
        cur.close()
        
        return response(200, {'message': 'Заявка удалена'})
    
    return response(405, {'error': 'Method not allowed'})

def handle_service_categories(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    if method == 'GET':
        cur = conn.cursor()
        cur.execute(f'SELECT id, name, icon, created_at FROM {SCHEMA}.ticket_service_categories ORDER BY name')
        categories = [dict(row) for row in cur.fetchall()]
        cur.close()
        return response(200, categories)
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        
        try:
            data = ServiceCategoryRequest(**body)
        except Exception as e:
            return response(400, {'error': f'Validation error: {str(e)}'})
        
        cur = conn.cursor()
        
        cur.execute(f"""
            INSERT INTO {SCHEMA}.ticket_service_categories (name, icon)
            VALUES (%s, %s)
            RETURNING id, name, icon, created_at
        """, (data.name, data.icon))
        
        category = dict(cur.fetchone())
        conn.commit()
        cur.close()
        
        return response(201, category)
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        category_id = body.get('id')
        if not category_id:
            return response(400, {'error': 'Category ID required'})
        
        update_fields = []
        params = []
        
        if 'name' in body:
            update_fields.append("name = %s")
            params.append(body['name'])
        
        if 'description' in body:
            update_fields.append("description = %s")
            params.append(body['description'])
        
        if 'icon' in body:
            update_fields.append("icon = %s")
            params.append(body['icon'])
        
        params.append(category_id)
        
        cur = conn.cursor()
        
        cur.execute(f"""
            UPDATE {SCHEMA}.ticket_service_categories 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, name, icon, created_at
        """, params)
        
        category = dict(cur.fetchone())
        conn.commit()
        cur.close()
        
        return response(200, category)
    
    elif method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        category_id = body.get('id')
        if not category_id:
            return response(400, {'error': 'Category ID required'})
        
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.ticket_service_categories WHERE id = %s", (category_id,))
        conn.commit()
        cur.close()
        
        return response(200, {'message': 'Категория удалена'})
    
    return response(405, {'error': 'Method not allowed'})

def handle_ticket_dictionaries(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Обработчик для получения справочников заявок"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    if method != 'GET':
        return response(405, {'error': 'Только GET запросы'})
    
    cur = conn.cursor()
    
    try:
        cur.execute(f'SELECT id, name, icon FROM {SCHEMA}.ticket_categories ORDER BY name')
        categories = [dict(row) for row in cur.fetchall()]
        
        cur.execute(f'SELECT id, name, level, color FROM {SCHEMA}.ticket_priorities ORDER BY level DESC')
        priorities = [dict(row) for row in cur.fetchall()]
        
        cur.execute(f'SELECT id, name, color, is_closed FROM {SCHEMA}.ticket_statuses ORDER BY id')
        statuses = [dict(row) for row in cur.fetchall()]
        
        cur.execute(f'SELECT id, name, description FROM {SCHEMA}.departments ORDER BY name')
        departments = [dict(row) for row in cur.fetchall()]
        
        cur.execute(f'SELECT id, name, field_type, options, is_required FROM {SCHEMA}.ticket_custom_fields ORDER BY name')
        custom_fields = [dict(row) for row in cur.fetchall()]
        
        return response(200, {
            'categories': categories,
            'priorities': priorities,
            'statuses': statuses,
            'departments': departments,
            'custom_fields': custom_fields
        })
    
    except Exception as e:
        return response(500, {'error': str(e)})
    finally:
        cur.close()

def handle_ticket_services(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Обработчик для управления услугами заявок (ticket_services)"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            cur.execute(f'''
                SELECT ts.id, ts.name, ts.description, ts.ticket_title, ts.category_id, 
                       tsc.name as category_name, ts.created_at 
                FROM {SCHEMA}.ticket_services ts
                LEFT JOIN {SCHEMA}.ticket_service_categories tsc ON ts.category_id = tsc.id
                WHERE ts.is_active = true
                ORDER BY ts.name
            ''')
            rows = cur.fetchall()
            ticket_services = []
            for row in rows:
                cur.execute(f'''
                    SELECT service_id 
                    FROM {SCHEMA}.ticket_service_mappings 
                    WHERE ticket_service_id = %s
                ''', (row['id'],))
                service_ids = [r['service_id'] for r in cur.fetchall()]
                
                ticket_services.append({
                    'id': row['id'],
                    'name': row['name'],
                    'description': row['description'] or '',
                    'ticket_title': row['ticket_title'] or '',
                    'category_id': row['category_id'],
                    'category_name': row['category_name'],
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                    'service_ids': service_ids
                })
            return response(200, ticket_services)
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            name = body.get('name')
            description = body.get('description', '')
            ticket_title = body.get('ticket_title', '')
            category_id = body.get('category_id')
            service_ids = body.get('service_ids', [])
            
            if not name:
                return response(400, {'error': 'Name is required'})
            
            cur.execute(
                f"INSERT INTO {SCHEMA}.ticket_services (name, description, ticket_title, category_id) VALUES (%s, %s, %s, %s) RETURNING id, name, description, ticket_title, category_id, created_at",
                (name, description, ticket_title, category_id)
            )
            row = cur.fetchone()
            ticket_service_id = row['id']
            
            for service_id in service_ids:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.ticket_service_mappings (ticket_service_id, service_id) VALUES (%s, %s)",
                    (ticket_service_id, service_id)
                )
            
            conn.commit()
            
            return response(201, {
                'id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'ticket_title': row['ticket_title'],
                'category_id': row['category_id'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                'service_ids': service_ids
            })
        
        elif method == 'PUT':
            params = event.get('queryStringParameters', {})
            body = json.loads(event.get('body', '{}'))
            ticket_service_id = params.get('id') or body.get('id')
            name = body.get('name')
            description = body.get('description', '')
            ticket_title = body.get('ticket_title', '')
            category_id = body.get('category_id')
            service_ids = body.get('service_ids', [])
            
            if not ticket_service_id or not name:
                return response(400, {'error': 'ID and name are required'})
            
            cur.execute(
                f"UPDATE {SCHEMA}.ticket_services SET name = %s, description = %s, ticket_title = %s, category_id = %s WHERE id = %s RETURNING id, name, description, ticket_title, category_id, created_at",
                (name, description, ticket_title, category_id, ticket_service_id)
            )
            row = cur.fetchone()
            
            if not row:
                return response(404, {'error': 'Ticket service not found'})
            
            cur.execute(
                f"DELETE FROM {SCHEMA}.ticket_service_mappings WHERE ticket_service_id = %s",
                (ticket_service_id,)
            )
            
            for service_id in service_ids:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.ticket_service_mappings (ticket_service_id, service_id) VALUES (%s, %s)",
                    (ticket_service_id, service_id)
                )
            
            conn.commit()
            
            return response(200, {
                'id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'ticket_title': row['ticket_title'],
                'category_id': row['category_id'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                'service_ids': service_ids
            })
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            ticket_service_id = params.get('id')
            
            if not ticket_service_id:
                return response(400, {'error': 'ID is required'})
            
            # First delete all related records from ticket_service_mappings table
            cur.execute(f'DELETE FROM {SCHEMA}.ticket_service_mappings WHERE ticket_service_id = %s', (ticket_service_id,))
            
            # Then delete from ticket_services table
            cur.execute(f'DELETE FROM {SCHEMA}.ticket_services WHERE id = %s', (ticket_service_id,))
            conn.commit()
            
            return response(200, {'success': True})
        
        return response(405, {'error': 'Method not allowed'})
    
    finally:
        cur.close()