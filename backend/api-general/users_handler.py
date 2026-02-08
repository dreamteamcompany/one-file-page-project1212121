import json
import sys
import os
import bcrypt
from models import UserRequest
from shared_utils import response
from permissions_middleware import check_permission

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def handle_users(method, event, conn, payload):
    user_id = payload.get('user_id')
    if not user_id:
        return response(401, {'error': 'User ID not found in token'})
    
    cur = conn.cursor()
    try:
        if method == 'GET':
            # Проверка права на чтение пользователей
            if not check_permission(conn, user_id, 'users', 'read'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to read users'})
            params = event.get('queryStringParameters', {}) or {}
            user_id = params.get('id')
            
            if user_id:
                cur.execute(f"SELECT * FROM {SCHEMA}.users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                if not user:
                    return response(404, {'error': 'User not found'})
                return response(200, dict(user))
            else:
                cur.execute(f"""
                    SELECT u.*, 
                           COALESCE(json_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) 
                                    FILTER (WHERE r.id IS NOT NULL), '[]') as roles
                    FROM {SCHEMA}.users u
                    LEFT JOIN {SCHEMA}.user_roles ur ON u.id = ur.user_id
                    LEFT JOIN {SCHEMA}.roles r ON ur.role_id = r.id
                    GROUP BY u.id
                    ORDER BY u.id
                """)
                users = cur.fetchall()
                return response(200, [dict(u) for u in users])
        
        elif method == 'POST':
            # Проверка права на создание пользователей
            if not check_permission(conn, user_id, 'users', 'create'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to create users'})
            
            body = json.loads(event.get('body', '{}'))
            log(f"[CREATE USER] Received body: {json.dumps(body)}")
            
            try:
                req = UserRequest(**body)
                log(f"[CREATE USER] Validated request: username={req.username}, full_name={req.full_name}")
            except Exception as validation_error:
                log(f"[CREATE USER] Validation error: {str(validation_error)}")
                return response(400, {'error': 'Validation error', 'details': str(validation_error)})
            
            log(f"[CREATE USER] Checking password: {req.password is not None}")
            
            if not req.password:
                log("[CREATE USER] Password is missing")
                return response(400, {'error': 'Password required'})
            
            log("[CREATE USER] About to hash password")
            
            try:
                password_hash = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                log(f"[CREATE USER] Password hashed successfully")
                
                # Получаем следующий ID вручную
                cur.execute(f"SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM {SCHEMA}.users")
                next_id = cur.fetchone()['next_id']
                log(f"[CREATE USER] Next ID: {next_id}")
                
                # Вставляем БЕЗ RETURNING (может быть проблема с правами на это)
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.users (id, username, password_hash, full_name, position, email, photo_url, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, true)
                """, (next_id, req.username, password_hash, req.full_name, req.position, req.email, req.photo_url))
                
                log(f"[CREATE USER] Insert executed, rowcount: {cur.rowcount}")
                
                new_user_id = next_id
                log(f"[CREATE USER] User created with ID: {new_user_id}")
                
                for role_id in req.role_ids:
                    log(f"[CREATE USER] Assigning role {role_id} to user {new_user_id}")
                    cur.execute(f"INSERT INTO {SCHEMA}.user_roles (user_id, role_id) VALUES (%s, %s)", (new_user_id, role_id))
                
                conn.commit()
                log(f"[CREATE USER] Transaction committed successfully")
                return response(201, {'id': new_user_id, 'message': 'User created'})
            except Exception as insert_error:
                conn.rollback()
                log(f"[CREATE USER] Insert error: {type(insert_error).__name__}: {str(insert_error)}")
                return response(500, {'error': 'Failed to create user', 'details': str(insert_error)})
        
        elif method == 'PUT':
            # Проверка права на редактирование пользователей
            if not check_permission(conn, user_id, 'users', 'update'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to update users'})
            
            params = event.get('queryStringParameters', {}) or {}
            target_user_id = params.get('id')
            if not target_user_id:
                return response(400, {'error': 'User ID required'})
            
            body = json.loads(event.get('body', '{}'))
            req = UserRequest(**body)
            
            if req.password:
                password_hash = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cur.execute(f"""
                    UPDATE {SCHEMA}.users 
                    SET username=%s, password_hash=%s, full_name=%s, position=%s, email=%s, photo_url=%s
                    WHERE id=%s
                """, (req.username, password_hash, req.full_name, req.position, req.email, req.photo_url, target_user_id))
            else:
                cur.execute(f"""
                    UPDATE {SCHEMA}.users 
                    SET username=%s, full_name=%s, position=%s, email=%s, photo_url=%s
                    WHERE id=%s
                """, (req.username, req.full_name, req.position, req.email, req.photo_url, target_user_id))
            
            cur.execute(f"DELETE FROM {SCHEMA}.user_roles WHERE user_id=%s", (target_user_id,))
            for role_id in req.role_ids:
                cur.execute(f"INSERT INTO {SCHEMA}.user_roles (user_id, role_id) VALUES (%s, %s)", (target_user_id, role_id))
            
            conn.commit()
            return response(200, {'message': 'User updated'})
        
        elif method == 'DELETE':
            # Проверка права на удаление пользователей
            if not check_permission(conn, user_id, 'users', 'remove'):
                return response(403, {'error': 'Access denied', 'message': 'No permission to delete users'})
            
            body = json.loads(event.get('body', '{}'))
            target_user_id = body.get('id')
            if not target_user_id:
                return response(400, {'error': 'User ID required'})
            
            # Проверяем, есть ли связанные заявки
            cur.execute(f"SELECT COUNT(*) as count FROM {SCHEMA}.tickets WHERE created_by=%s OR assigned_to=%s", (target_user_id, target_user_id))
            ticket_count = cur.fetchone()['count']
            if ticket_count > 0:
                return response(400, {'error': f'Cannot delete user with {ticket_count} related tickets'})
            
            # Удаляем связи с ролями (можно удалить безопасно)
            cur.execute(f"DELETE FROM {SCHEMA}.user_roles WHERE user_id=%s", (target_user_id,))
            
            # Удаляем пользователя
            cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id=%s", (target_user_id,))
            conn.commit()
            return response(200, {'message': 'User deleted'})
        
        else:
            return response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        conn.rollback()
        log(f"Error in handle_users: {str(e)}")
        return response(500, {'error': str(e)})
    finally:
        cur.close()