import sys
from shared_utils import response

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def handle_user_permissions(method, event, conn, payload):
    '''Обработчик для получения прав текущего пользователя'''
    
    if method != 'GET':
        return response(405, {'error': 'Method not allowed'})
    
    user_id = payload.get('user_id')
    if not user_id:
        return response(401, {'error': 'User ID not found in token'})
    
    cur = conn.cursor()
    try:
        # Получаем все права пользователя через его роли
        cur.execute("""
            SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = %s
            ORDER BY p.resource, p.action
        """, (user_id,))
        
        permissions = cur.fetchall()
        
        # Группируем права по ресурсам для удобства фронтенда
        grouped = {}
        for perm in permissions:
            resource = perm['resource']
            if resource not in grouped:
                grouped[resource] = {
                    'create': False,
                    'read': False,
                    'update': False,
                    'remove': False
                }
            grouped[resource][perm['action']] = True
        
        return response(200, {
            'user_id': user_id,
            'permissions': [dict(p) for p in permissions],
            'grouped': grouped
        })
        
    except Exception as e:
        log(f"Error in handle_user_permissions: {str(e)}")
        return response(500, {'error': str(e)})
    finally:
        cur.close()
