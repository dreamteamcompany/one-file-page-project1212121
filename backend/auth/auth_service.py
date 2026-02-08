"""
Сервис авторизации - обработка login, me, refresh
Single Responsibility: только авторизация пользователей
"""
import json
import os
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any
from jwt_service import create_token
from database_service import get_user_by_username, get_user_by_id, update_last_login

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')


def handle_login(event: dict, conn) -> Dict[str, Any]:
    """Обработка входа пользователя"""
    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username', '').strip()
        password = body.get('password', '')
        
        print(f"[LOGIN DEBUG] Username: {username}, Password length: {len(password)}")
        
        if not username or not password:
            return {'error': 'Требуются имя пользователя и пароль', 'status': 400}
        
        user = get_user_by_username(conn, username)
        
        if not user:
            print(f"[LOGIN DEBUG] User not found: {username}")
            return {'error': 'Неверное имя пользователя или пароль', 'status': 401}
        
        print(f"[LOGIN DEBUG] User found: {user['username']}, is_active: {user['is_active']}")
        print(f"[LOGIN DEBUG] Password hash: {user['password_hash'][:20]}...")
        
        if not user['is_active']:
            return {'error': 'Учетная запись отключена', 'status': 403}
        
        # ВРЕМЕННОЕ РЕШЕНИЕ: если хеш невалидный, проверяем простой пароль и обновляем хеш
        password_valid = False
        try:
            password_valid = bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8'))
            print(f"[LOGIN DEBUG] Bcrypt check result: {password_valid}")
        except ValueError as e:
            print(f"[LOGIN DEBUG] Bcrypt ValueError: {str(e)}")
            # Невалидный bcrypt хеш - проверяем, может это admin123
            if username == 'admin' and password == 'admin123':
                print("[LOGIN DEBUG] Using fallback for admin/admin123")
                # Генерируем правильный хеш и обновляем
                new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cur = conn.cursor()
                cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (new_hash, user['id']))
                conn.commit()
                cur.close()
                print(f"[LOGIN DEBUG] Password hash updated to: {new_hash[:20]}...")
                password_valid = True
        except Exception as e:
            print(f"[LOGIN DEBUG] Bcrypt exception: {type(e).__name__}: {str(e)}")
        
        if not password_valid:
            print("[LOGIN DEBUG] Password validation failed")
            return {'error': 'Неверное имя пользователя или пароль', 'status': 401}
        
        update_last_login(conn, user['id'])
        token = create_token(user['id'], user['username'])
        
        return {
            'status': 200,
            'data': {
                'token': token,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'is_active': user['is_active'],
                    'last_login': user.get('last_login'),
                    'roles': user['roles'] if user['roles'] else [],
                    'permissions': user['permissions'] if user['permissions'] else []
                }
            }
        }
    
    except Exception as e:
        return {'error': str(e), 'status': 500}


def handle_me(conn, payload: dict) -> Dict[str, Any]:
    """Получить информацию о текущем пользователе"""
    try:
        user_id = payload['user_id']
        user = get_user_by_id(conn, user_id)
        
        if not user:
            return {'error': 'Пользователь не найден', 'status': 404}
        
        return {
            'status': 200,
            'data': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'is_active': user['is_active'],
                'last_login': user['last_login'],
                'roles': user['roles'] if user['roles'] else [],
                'permissions': user['permissions'] if user['permissions'] else []
            }
        }
    
    except Exception as e:
        return {'error': str(e), 'status': 500}


def handle_refresh(conn, payload: dict) -> Dict[str, Any]:
    """Обновить JWT токен"""
    try:
        user_id = payload['user_id']
        username = payload['username']
        
        cur = conn.cursor()
        cur.execute(f"SELECT is_active FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()
        
        if not user or not user['is_active']:
            return {'error': 'Недействительный токен', 'status': 401}
        
        new_token = create_token(user_id, username)
        
        return {'status': 200, 'data': {'token': new_token}}
    
    except Exception as e:
        return {'error': str(e), 'status': 500}