"""
Сервис базы данных - работа с БД
Single Responsibility: только операции с базой данных
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any


DATABASE_URL = os.environ.get('DATABASE_URL')
MAIN_DB_SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_db_connection():
    """Получить подключение к базе данных"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def get_user_by_username(conn, username: str) -> Optional[Dict[str, Any]]:
    """Получить пользователя по имени"""
    cur = conn.cursor()
    schema = MAIN_DB_SCHEMA
    cur.execute(f"""
        SELECT u.id, u.username, u.email, u.full_name, u.password_hash, u.is_active,
               COALESCE(json_agg(DISTINCT jsonb_build_object(
                   'id', r.id, 
                   'name', r.name,
                   'description', r.description
               )) FILTER (WHERE r.id IS NOT NULL), '[]') as roles,
               COALESCE(json_agg(DISTINCT jsonb_build_object(
                   'name', p.name,
                   'resource', p.resource,
                   'action', p.action
               )) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
        FROM {schema}.users u
        LEFT JOIN {schema}.user_roles ur ON u.id = ur.user_id
        LEFT JOIN {schema}.roles r ON ur.role_id = r.id
        LEFT JOIN {schema}.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN {schema}.permissions p ON rp.permission_id = p.id
        WHERE u.username = %s
        GROUP BY u.id
    """, (username,))
    
    user = cur.fetchone()
    cur.close()
    return user


def get_user_by_id(conn, user_id: int) -> Optional[Dict[str, Any]]:
    """Получить пользователя по ID"""
    cur = conn.cursor()
    schema = MAIN_DB_SCHEMA
    cur.execute(f"""
        SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login,
               COALESCE(json_agg(DISTINCT jsonb_build_object(
                   'id', r.id,
                   'name', r.name,
                   'description', r.description
               )) FILTER (WHERE r.id IS NOT NULL), '[]') as roles,
               COALESCE(json_agg(DISTINCT jsonb_build_object(
                   'name', p.name,
                   'resource', p.resource,
                   'action', p.action
               )) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
        FROM {schema}.users u
        LEFT JOIN {schema}.user_roles ur ON u.id = ur.user_id
        LEFT JOIN {schema}.roles r ON ur.role_id = r.id
        LEFT JOIN {schema}.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN {schema}.permissions p ON rp.permission_id = p.id
        WHERE u.id = %s
        GROUP BY u.id
    """, (user_id,))
    
    user = cur.fetchone()
    cur.close()
    return user


def update_last_login(conn, user_id: int):
    """Обновить время последнего входа"""
    cur = conn.cursor()
    schema = MAIN_DB_SCHEMA
    cur.execute(f"UPDATE {schema}.users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
    conn.commit()
    cur.close()