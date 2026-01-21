"""
Сервис JWT - работа с токенами
Single Responsibility: только JWT токены
"""
import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any


JWT_SECRET = os.environ.get('JWT_SECRET', 'super_secret_key_change_me')


def create_token(user_id: int, username: str) -> str:
    """Создать JWT токен"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_token(event: dict) -> Optional[Dict[str, Any]]:
    """Проверить JWT токен из заголовков"""
    headers = event.get('headers', {})
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
