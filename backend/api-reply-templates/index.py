"""
API для управления шаблонами ответов в комментариях заявок.
Личные шаблоны (is_shared=false) — каждый для себя.
Общие шаблоны (is_shared=true) — только для администраторов.
Доступно исполнителям и администраторам.
"""
import json
from typing import Dict, Any
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA


def _is_admin(cur, user_id: int) -> bool:
    cur.execute(f"""
        SELECT 1 FROM {SCHEMA}.user_roles ur
        JOIN {SCHEMA}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s AND r.system_role = 'admin'
        LIMIT 1
    """, (user_id,))
    return cur.fetchone() is not None


def handler(event: dict, context) -> dict:
    """CRUD для шаблонов ответов"""
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    user_id = payload.get('user_id')

    conn = get_db_connection()
    if not conn:
        return response(500, {'error': 'Database connection failed'})

    try:
        method = event.get('httpMethod', 'GET')
        params = event.get('queryStringParameters') or {}
        cur = conn.cursor()

        is_admin = _is_admin(cur, user_id)

        # GET — список шаблонов: общие + свои личные
        if method == 'GET':
            q = params.get('q', '').strip()
            where = f"""
                WHERE (rt.is_shared = TRUE OR rt.created_by = %s)
            """
            args = [user_id]
            if q:
                where += " AND (rt.title ILIKE %s OR rt.content ILIKE %s)"
                args += [f"%{q}%", f"%{q}%"]

            cur.execute(f"""
                SELECT rt.id, rt.title, rt.content, rt.is_shared,
                       rt.created_by, rt.created_at, rt.updated_at,
                       u.full_name AS author_name
                FROM {SCHEMA}.reply_templates rt
                LEFT JOIN {SCHEMA}.users u ON u.id = rt.created_by
                {where}
                ORDER BY rt.is_shared DESC, rt.title ASC
            """, args)
            templates = [dict(r) for r in cur.fetchall()]
            return response(200, templates)

        # POST — создать шаблон
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            title = (body.get('title') or '').strip()
            content = (body.get('content') or '').strip()
            is_shared = bool(body.get('is_shared', False))

            if not title:
                return response(400, {'error': 'Название шаблона обязательно'})
            if not content:
                return response(400, {'error': 'Текст шаблона обязателен'})
            if is_shared and not is_admin:
                return response(403, {'error': 'Общие шаблоны может создавать только администратор'})

            cur.execute(f"""
                INSERT INTO {SCHEMA}.reply_templates (title, content, is_shared, created_by)
                VALUES (%s, %s, %s, %s)
                RETURNING id, title, content, is_shared, created_by, created_at, updated_at
            """, (title, content, is_shared, user_id))
            tmpl = dict(cur.fetchone())
            conn.commit()
            return response(201, tmpl)

        # PUT — обновить шаблон
        if method == 'PUT':
            tmpl_id = params.get('id')
            if not tmpl_id:
                return response(400, {'error': 'Не указан id шаблона'})

            cur.execute(f"SELECT * FROM {SCHEMA}.reply_templates WHERE id = %s", (int(tmpl_id),))
            tmpl = cur.fetchone()
            if not tmpl:
                return response(404, {'error': 'Шаблон не найден'})

            if not is_admin and tmpl['created_by'] != user_id:
                return response(403, {'error': 'Нет прав на редактирование'})

            body = json.loads(event.get('body') or '{}')
            title = (body.get('title') or tmpl['title']).strip()
            content = (body.get('content') or tmpl['content']).strip()
            is_shared = body.get('is_shared', tmpl['is_shared'])

            if is_shared and not is_admin:
                return response(403, {'error': 'Только администратор может делать шаблон общим'})

            cur.execute(f"""
                UPDATE {SCHEMA}.reply_templates
                SET title = %s, content = %s, is_shared = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING id, title, content, is_shared, created_by, created_at, updated_at
            """, (title, content, is_shared, int(tmpl_id)))
            updated = dict(cur.fetchone())
            conn.commit()
            return response(200, updated)

        # DELETE — удалить шаблон
        if method == 'DELETE':
            tmpl_id = params.get('id')
            if not tmpl_id:
                return response(400, {'error': 'Не указан id шаблона'})

            cur.execute(f"SELECT created_by FROM {SCHEMA}.reply_templates WHERE id = %s", (int(tmpl_id),))
            tmpl = cur.fetchone()
            if not tmpl:
                return response(404, {'error': 'Шаблон не найден'})

            if not is_admin and tmpl['created_by'] != user_id:
                return response(403, {'error': 'Нет прав на удаление'})

            cur.execute(f"UPDATE {SCHEMA}.reply_templates SET created_by = NULL WHERE id = %s", (int(tmpl_id),))
            cur.execute(f"DELETE FROM {SCHEMA}.reply_templates WHERE id = %s", (int(tmpl_id),))
            conn.commit()
            return response(200, {'ok': True})

        return response(405, {'error': 'Метод не поддерживается'})

    except Exception as e:
        import traceback
        print(f"[api-reply-templates] error: {e}\n{traceback.format_exc()}")
        return response(500, {'error': str(e)})
    finally:
        conn.close()
