import sys
from shared_utils import response

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def check_permission(conn, user_id: int, resource: str, action: str) -> bool:
    '''
    Проверяет, есть ли у пользователя право на выполнение действия с ресурсом.
    
    Args:
        conn: соединение с БД
        user_id: ID пользователя
        resource: ресурс (например, 'tickets', 'users')
        action: действие (например, 'create', 'read', 'update', 'remove')
    
    Returns:
        True если есть право, False если нет
    '''
    cur = conn.cursor()
    try:
        # Получаем все права пользователя через его роли
        cur.execute("""
            SELECT p.resource, p.action
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = %s
        """, (user_id,))
        
        user_permissions = cur.fetchall()
        
        # Проверяем, есть ли нужное право
        for perm in user_permissions:
            if perm['resource'] == resource and perm['action'] == action:
                return True
        
        log(f"[PERMISSIONS] User {user_id} does NOT have permission {resource}.{action}")
        return False
        
    except Exception as e:
        log(f"[PERMISSIONS] Error checking permission: {str(e)}")
        return False
    finally:
        cur.close()

def require_permission(resource: str, action: str):
    '''
    Декоратор для проверки прав доступа перед выполнением функции-обработчика.
    
    Usage:
        @require_permission('tickets', 'create')
        def create_ticket(conn, user_id, data):
            ...
    '''
    def decorator(func):
        def wrapper(conn, payload, *args, **kwargs):
            user_id = payload.get('user_id')
            if not user_id:
                return response(401, {'error': 'User ID not found in token'})
            
            if not check_permission(conn, user_id, resource, action):
                return response(403, {
                    'error': 'Access denied',
                    'message': f'You do not have permission to {action} {resource}'
                })
            
            return func(conn, payload, *args, **kwargs)
        return wrapper
    return decorator

def check_permissions_batch(conn, user_id: int, required_permissions: list) -> dict:
    '''
    Проверяет набор прав пользователя за один запрос к БД.
    
    Args:
        conn: соединение с БД
        user_id: ID пользователя
        required_permissions: список словарей [{'resource': 'tickets', 'action': 'create'}, ...]
    
    Returns:
        словарь {resource.action: True/False}
    '''
    cur = conn.cursor()
    try:
        # Получаем все права пользователя
        cur.execute("""
            SELECT p.resource, p.action
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = %s
        """, (user_id,))
        
        user_permissions = cur.fetchall()
        user_perms_set = {f"{p['resource']}.{p['action']}" for p in user_permissions}
        
        # Проверяем каждое требуемое право
        result = {}
        for perm in required_permissions:
            key = f"{perm['resource']}.{perm['action']}"
            result[key] = key in user_perms_set
        
        return result
        
    except Exception as e:
        log(f"[PERMISSIONS] Error checking batch permissions: {str(e)}")
        return {f"{p['resource']}.{p['action']}": False for p in required_permissions}
    finally:
        cur.close()

def has_any_permission(conn, user_id: int, resource: str) -> bool:
    '''
    Проверяет, есть ли у пользователя ХОТЬ КАКОЕ-ТО право на ресурс.
    Полезно для показа/скрытия разделов в UI.
    '''
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT COUNT(*) as count
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = %s AND p.resource = %s
        """, (user_id, resource))
        
        result = cur.fetchone()
        return result['count'] > 0
        
    except Exception as e:
        log(f"[PERMISSIONS] Error checking any permission: {str(e)}")
        return False
    finally:
        cur.close()
