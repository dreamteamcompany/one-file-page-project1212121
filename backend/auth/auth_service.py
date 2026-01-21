"""
Сервис авторизации - обработка login, me, refresh
Single Responsibility: только авторизация пользователей
"""
import json
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any
from jwt_service import create_token
from database_service import get_user_by_username, get_user_by_id, update_last_login


def handle_login(event: dict, conn) -> Dict[str, Any]:
    """Обработка входа пользователя"""
    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username', '').strip()
        password = body.get('password', '')
        
        if not username or not password:
            return {'error': 'Требуются имя пользователя и пароль', 'status': 400}
        
        user = get_user_by_username(conn, username)
        
        if not user:
            return {'error': 'Неверное имя пользователя или пароль', 'status': 401}
        
        if not user['is_active']:
            return {'error': 'Учетная запись отключена', 'status': 403}
        
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
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
        cur.execute("SELECT is_active FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()
        
        if not user or not user['is_active']:
            return {'error': 'Недействительный токен', 'status': 401}
        
        new_token = create_token(user_id, username)
        
        return {'status': 200, 'data': {'token': new_token}}
    
    except Exception as e:
        return {'error': str(e), 'status': 500}
