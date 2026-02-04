import json
import sys
from models import RoleRequest
from shared_utils import response
from permissions_middleware import check_permission

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def handle_roles(method, event, conn, payload):
    user_id = payload.get('user_id')
    if not user_id:
        return response(401, {'error': 'User ID not found in token'})
    cur = conn.cursor()
    try:
        if method == 'GET':
            # Проверка права на чтение ролей
            if not check_permission(conn, user_id, 'roles', 'read'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to read roles'})
            cur.execute("""
                SELECT r.*, 
                       COALESCE(json_agg(DISTINCT jsonb_build_object(
                           'id', p.id, 'name', p.name, 'resource', p.resource, 'action', p.action
                       )) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
                FROM roles r
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                LEFT JOIN permissions p ON rp.permission_id = p.id
                GROUP BY r.id
                ORDER BY r.id
            """)
            roles = cur.fetchall()
            return response(200, [dict(r) for r in roles])
        
        elif method == 'POST':
            # Проверка права на создание ролей
            if not check_permission(conn, user_id, 'roles', 'create'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to create roles'})
            
            body = json.loads(event.get('body', '{}'))
            req = RoleRequest(**body)
            
            cur.execute("INSERT INTO roles (name, description) VALUES (%s, %s) RETURNING id",
                       (req.name, req.description))
            role_id = cur.fetchone()['id']
            
            for perm_id in req.permission_ids:
                cur.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (%s, %s)",
                           (role_id, perm_id))
            
            conn.commit()
            return response(201, {'id': role_id, 'message': 'Role created'})
        
        elif method == 'PUT':
            # Проверка права на редактирование ролей
            if not check_permission(conn, user_id, 'roles', 'update'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to update roles'})
            
            params = event.get('queryStringParameters', {}) or {}
            role_id = params.get('id')
            if not role_id:
                return response(400, {'error': 'Role ID required'})
            
            body = json.loads(event.get('body', '{}'))
            req = RoleRequest(**body)
            
            cur.execute("UPDATE roles SET name=%s, description=%s WHERE id=%s",
                       (req.name, req.description, role_id))
            cur.execute("DELETE FROM role_permissions WHERE role_id=%s", (role_id,))
            
            for perm_id in req.permission_ids:
                cur.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (%s, %s)",
                           (role_id, perm_id))
            
            conn.commit()
            return response(200, {'message': 'Role updated'})
        
        elif method == 'DELETE':
            # Проверка права на удаление ролей
            if not check_permission(conn, user_id, 'roles', 'remove'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to delete roles'})
            
            body = json.loads(event.get('body', '{}'))
            role_id = body.get('id')
            if not role_id:
                return response(400, {'error': 'Role ID required'})
            
            # Check if role has assigned users
            cur.execute("SELECT COUNT(*) as count FROM user_roles WHERE role_id=%s", (role_id,))
            user_count = cur.fetchone()['count']
            if user_count > 0:
                return response(400, {'error': 'Cannot delete role with assigned users'})
            
            # Delete role permissions first (foreign key constraint)
            cur.execute("DELETE FROM role_permissions WHERE role_id=%s", (role_id,))
            cur.execute("DELETE FROM roles WHERE id=%s", (role_id,))
            conn.commit()
            return response(200, {'message': 'Role deleted'})
        
        else:
            return response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        conn.rollback()
        log(f"Error in handle_roles: {str(e)}")
        return response(500, {'error': str(e)})
    finally:
        cur.close()