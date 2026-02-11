import json
from typing import Dict, Any
from shared_utils import response, verify_token, SCHEMA

def handle_ticket_priorities(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Обработчик для управления приоритетами заявок"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    if method == 'GET':
        cur = conn.cursor()
        cur.execute(f'SELECT id, name, level, color FROM {SCHEMA}.ticket_priorities ORDER BY level')
        priorities = [dict(row) for row in cur.fetchall()]
        cur.close()
        return response(200, priorities)
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        name = body.get('name')
        level = body.get('level', 1)
        color = body.get('color', '#3b82f6')
        
        if not name:
            return response(400, {'error': 'Name is required'})
        
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.ticket_priorities (name, level, color) VALUES (%s, %s, %s) RETURNING id, name, level, color",
            (name, level, color)
        )
        priority = dict(cur.fetchone())
        conn.commit()
        cur.close()
        return response(201, priority)
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        priority_id = body.get('id')
        name = body.get('name')
        level = body.get('level', 1)
        color = body.get('color', '#3b82f6')
        
        if not priority_id or not name:
            return response(400, {'error': 'ID and name are required'})
        
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.ticket_priorities SET name = %s, level = %s, color = %s WHERE id = %s RETURNING id, name, level, color",
            (name, level, color, priority_id)
        )
        priority = cur.fetchone()
        
        if not priority:
            cur.close()
            return response(404, {'error': 'Priority not found'})
        
        priority = dict(priority)
        conn.commit()
        cur.close()
        return response(200, priority)
    
    elif method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        priority_id = body.get('id')
        
        if not priority_id:
            return response(400, {'error': 'ID is required'})
        
        cur = conn.cursor()
        
        cur.execute(f"SELECT COUNT(*) as count FROM {SCHEMA}.tickets WHERE priority_id = %s", (priority_id,))
        tickets_count = cur.fetchone()['count']
        
        if tickets_count > 0:
            cur.close()
            return response(400, {'error': f'Cannot delete priority: {tickets_count} tickets are using it'})
        
        cur.execute(f"DELETE FROM {SCHEMA}.ticket_priorities WHERE id = %s", (priority_id,))
        conn.commit()
        cur.close()
        return response(200, {'message': 'Priority deleted successfully'})
    
    return response(405, {'error': 'Method not allowed'})
