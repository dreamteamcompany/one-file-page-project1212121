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


def _build_roles_with_permissions(conn, schema: str, where_clause: str, param) -> Optional[Dict[str, Any]]:
    """Вспомогательная функция: получить пользователя с ролями и permissions по каждой роли"""
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.username, u.email, u.full_name, u.photo_url,
               u.password_hash, u.is_active, u.last_login,
               COALESCE(
                   json_agg(DISTINCT jsonb_build_object(
                       'id', r.id,
                       'name', r.name,
                       'description', r.description,
                       'system_role', r.system_role
                   )) FILTER (WHERE r.id IS NOT NULL), '[]'
               ) as roles
        FROM {schema}.users u
        LEFT JOIN {schema}.user_roles ur ON u.id = ur.user_id
        LEFT JOIN {schema}.roles r ON ur.role_id = r.id
        WHERE {where_clause}
        GROUP BY u.id
    """, (param,))
    user = cur.fetchone()
    if not user:
        cur.close()
        return None

    user = dict(user)
    roles = user.get('roles') or []
    if isinstance(roles, str):
        import json as _json
        roles = _json.loads(roles)

    role_ids = [r['id'] for r in roles if r.get('id')]
    role_permissions_map: Dict[int, list] = {r['id']: [] for r in roles if r.get('id')}
    all_permissions = []

    if role_ids:
        placeholders = ','.join(['%s'] * len(role_ids))
        cur.execute(f"""
            SELECT rp.role_id,
                   p.name, p.resource, p.action
            FROM {schema}.role_permissions rp
            JOIN {schema}.permissions p ON rp.permission_id = p.id
            WHERE rp.role_id IN ({placeholders})
        """, role_ids)
        rows = cur.fetchall()
        seen = set()
        for row in rows:
            row = dict(row)
            role_id = row['role_id']
            perm = {'name': row['name'], 'resource': row['resource'], 'action': row['action']}
            role_permissions_map[role_id].append(perm)
            key = (row['resource'], row['action'])
            if key not in seen:
                seen.add(key)
                all_permissions.append(perm)

    for role in roles:
        if role.get('id'):
            role['permissions'] = role_permissions_map.get(role['id'], [])

    user['roles'] = roles
    user['permissions'] = all_permissions
    cur.close()
    return user


def get_user_by_username(conn, username: str) -> Optional[Dict[str, Any]]:
    """Получить пользователя по имени"""
    schema = MAIN_DB_SCHEMA
    return _build_roles_with_permissions(conn, schema, 'u.username = %s', username)


def get_user_by_id(conn, user_id: int) -> Optional[Dict[str, Any]]:
    """Получить пользователя по ID"""
    schema = MAIN_DB_SCHEMA
    return _build_roles_with_permissions(conn, schema, 'u.id = %s', user_id)


def update_last_login(conn, user_id: int):
    """Обновить время последнего входа"""
    cur = conn.cursor()
    schema = MAIN_DB_SCHEMA
    cur.execute(f"UPDATE {schema}.users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
    conn.commit()
    cur.close()