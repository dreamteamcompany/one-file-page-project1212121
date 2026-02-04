import sys
from shared_utils import response

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def handle_permissions(method, event, conn):
    '''Обработчик для работы с разрешениями (permissions)'''
    cur = conn.cursor()
    try:
        if method == 'GET':
            # Получаем все разрешения из БД
            cur.execute("""
                SELECT id, name, resource, action, description
                FROM permissions
                ORDER BY resource, action
            """)
            permissions = cur.fetchall()
            return response(200, [dict(p) for p in permissions])
        
        else:
            return response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        log(f"Error in handle_permissions: {str(e)}")
        return response(500, {'error': str(e)})
    finally:
        cur.close()
