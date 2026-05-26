"""
API правил автоназначения наблюдателей заявок.
GET    /         - список правил с условиями и адресатами
GET    /?id=X    - одно правило
GET    /?action=reference - справочники (категории, отделы, приоритеты, группы, пользователи, роли)
POST   /         - создать правило
PUT    /?id=X    - обновить правило
DELETE /?id=X    - удалить правило
POST   /?action=apply - применить правила к заявке (используется внутренне) body: {ticket_id, trigger: 'create'|'update'}
"""
import json
from typing import Any, Dict, List, Optional

from shared_utils import (
    response, get_db_connection, verify_token,
    handle_options, safe_int, get_query_param, SCHEMA,
)

VALID_TARGET_TYPES = ('user', 'group', 'role')


def handler(event, context):
    """Управление правилами автоназначения наблюдателей"""
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    method = event.get('httpMethod', 'GET')
    action = get_query_param(event, 'action', '')

    try:
        conn = get_db_connection()
    except Exception:
        return response(500, {'error': 'Database connection failed'})

    try:
        if method == 'GET':
            if action == 'reference':
                return get_reference(conn)
            rid = safe_int(get_query_param(event, 'id'))
            if rid:
                return get_rule(conn, rid)
            return list_rules(conn)

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            if action == 'apply':
                return apply_rules(conn, body)
            if action == 'apply_executor_change':
                return apply_executor_change(conn, body)
            if action == 'backfill':
                return backfill_rules(conn, body)
            return create_rule(conn, body)

        if method == 'PUT':
            rid = safe_int(get_query_param(event, 'id'))
            if not rid:
                return response(400, {'error': 'id обязателен'})
            body = json.loads(event.get('body') or '{}')
            return update_rule(conn, rid, body)

        if method == 'DELETE':
            rid = safe_int(get_query_param(event, 'id'))
            if not rid:
                return response(400, {'error': 'id обязателен'})
            return delete_rule(conn, rid)

        return response(405, {'error': 'Method not allowed'})
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        return response(500, {'error': str(e)})
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _fetch_targets(conn, rule_ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
    if not rule_ids:
        return {}
    cur = conn.cursor()
    ids_csv = ','.join(str(int(x)) for x in rule_ids)
    cur.execute(f"""
        SELECT t.id, t.rule_id, t.target_type, t.target_id,
               CASE t.target_type
                 WHEN 'user'  THEN (SELECT u.full_name FROM {SCHEMA}.users u WHERE u.id = t.target_id)
                 WHEN 'group' THEN (SELECT g.name FROM {SCHEMA}.executor_groups g WHERE g.id = t.target_id)
                 WHEN 'role'  THEN (SELECT r.name FROM {SCHEMA}.roles r WHERE r.id = t.target_id)
               END AS target_name
        FROM {SCHEMA}.ticket_watcher_rule_targets t
        WHERE t.rule_id IN ({ids_csv})
        ORDER BY t.id
    """)
    grouped: Dict[int, List[Dict[str, Any]]] = {}
    for row in cur.fetchall():
        grouped.setdefault(row['rule_id'], []).append(dict(row))
    cur.close()
    return grouped


def list_rules(conn):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT r.id, r.name, r.description, r.is_active,
               r.trigger_on_create, r.trigger_on_update, r.trigger_on_executor_change,
               r.category_id, c.name AS category_name,
               r.department_id, d.name AS department_name,
               r.priority_id, p.name AS priority_name,
               r.executor_group_id, g.name AS executor_group_name,
               r.assignee_id, u.full_name AS assignee_name,
               r.match_mode,
               r.created_at, r.updated_at
        FROM {SCHEMA}.ticket_watcher_rules r
        LEFT JOIN {SCHEMA}.ticket_categories c ON c.id = r.category_id
        LEFT JOIN {SCHEMA}.departments d ON d.id = r.department_id
        LEFT JOIN {SCHEMA}.ticket_priorities p ON p.id = r.priority_id
        LEFT JOIN {SCHEMA}.executor_groups g ON g.id = r.executor_group_id
        LEFT JOIN {SCHEMA}.users u ON u.id = r.assignee_id
        ORDER BY r.created_at DESC
    """)
    rules = [dict(r) for r in cur.fetchall()]
    cur.close()

    targets_by_rule = _fetch_targets(conn, [r['id'] for r in rules])
    for r in rules:
        r['targets'] = targets_by_rule.get(r['id'], [])
    return response(200, rules)


def get_rule(conn, rule_id: int):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT r.id, r.name, r.description, r.is_active,
               r.trigger_on_create, r.trigger_on_update, r.trigger_on_executor_change,
               r.category_id, r.department_id, r.priority_id, r.executor_group_id,
               r.assignee_id,
               r.match_mode,
               r.created_at, r.updated_at
        FROM {SCHEMA}.ticket_watcher_rules r WHERE r.id = %s
    """, (rule_id,))
    rule = cur.fetchone()
    cur.close()
    if not rule:
        return response(404, {'error': 'Правило не найдено'})
    rule = dict(rule)
    rule['targets'] = _fetch_targets(conn, [rule_id]).get(rule_id, [])
    return response(200, rule)


def _normalize_targets(raw) -> List[Dict[str, int]]:
    out: List[Dict[str, int]] = []
    if not isinstance(raw, list):
        return out
    seen = set()
    for t in raw:
        if not isinstance(t, dict):
            continue
        tt = str(t.get('target_type') or '').strip()
        tid = safe_int(t.get('target_id'))
        if tt not in VALID_TARGET_TYPES or not tid:
            continue
        key = (tt, tid)
        if key in seen:
            continue
        seen.add(key)
        out.append({'target_type': tt, 'target_id': tid})
    return out


def _validate_rule_payload(body: Dict[str, Any]) -> Optional[str]:
    name = (body.get('name') or '').strip()
    if not name:
        return 'Название обязательно'
    on_executor_change = bool(body.get('trigger_on_executor_change'))
    on_create = bool(body.get('trigger_on_create'))
    on_update = bool(body.get('trigger_on_update'))
    if not (on_create or on_update or on_executor_change):
        return 'Выберите хотя бы один триггер срабатывания'
    has_condition = any(safe_int(body.get(k)) for k in (
        'category_id', 'department_id', 'priority_id', 'executor_group_id', 'assignee_id'
    ))
    if (on_create or on_update) and not has_condition:
        return 'Для триггеров «При создании»/«При изменении» укажите хотя бы одно условие в блоке «Если»'
    targets = _normalize_targets(body.get('targets'))
    if not targets and not on_executor_change:
        return 'Укажите хотя бы одного наблюдателя в блоке «То»'
    mode = str(body.get('match_mode') or 'AND').upper()
    if mode not in ('AND', 'OR'):
        return 'match_mode должен быть AND или OR'
    return None


def _normalize_match_mode(value) -> str:
    mode = str(value or 'AND').upper()
    return 'OR' if mode == 'OR' else 'AND'


def _rule_matches_ticket(rule: Dict[str, Any], ticket: Dict[str, Any], assignee_override: Optional[int] = None) -> bool:
    """Возвращает True, если условия правила совпадают с заявкой согласно match_mode."""
    mode = _normalize_match_mode(rule.get('match_mode'))
    assignee_value = assignee_override if assignee_override is not None else ticket.get('assigned_to')
    conditions = [
        (rule.get('category_id'), ticket.get('category_id')),
        (rule.get('department_id'), ticket.get('department_id')),
        (rule.get('priority_id'), ticket.get('priority_id')),
        (rule.get('executor_group_id'), ticket.get('executor_group_id')),
        (rule.get('assignee_id'), assignee_value),
    ]
    non_empty = [(rv, tv) for rv, tv in conditions if rv]
    if not non_empty:
        return False
    if mode == 'OR':
        return any(rv == tv for rv, tv in non_empty)
    return all(rv == tv for rv, tv in non_empty)


def create_rule(conn, body: Dict[str, Any]):
    err = _validate_rule_payload(body)
    if err:
        return response(400, {'error': err})

    cur = conn.cursor()
    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_watcher_rules
        (name, description, is_active, trigger_on_create, trigger_on_update, trigger_on_executor_change,
         category_id, department_id, priority_id, executor_group_id, assignee_id, match_mode)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        (body.get('name') or '').strip(),
        body.get('description'),
        bool(body.get('is_active', True)),
        bool(body.get('trigger_on_create', True)),
        bool(body.get('trigger_on_update', False)),
        bool(body.get('trigger_on_executor_change', False)),
        safe_int(body.get('category_id')),
        safe_int(body.get('department_id')),
        safe_int(body.get('priority_id')),
        safe_int(body.get('executor_group_id')),
        safe_int(body.get('assignee_id')),
        _normalize_match_mode(body.get('match_mode')),
    ))
    rule_id = cur.fetchone()['id']

    targets = _normalize_targets(body.get('targets'))
    for t in targets:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.ticket_watcher_rule_targets (rule_id, target_type, target_id)
            VALUES (%s,%s,%s)
            ON CONFLICT (rule_id, target_type, target_id) DO NOTHING
        """, (rule_id, t['target_type'], t['target_id']))

    conn.commit()
    cur.close()
    return get_rule(conn, rule_id)


def update_rule(conn, rule_id: int, body: Dict[str, Any]):
    err = _validate_rule_payload(body)
    if err:
        return response(400, {'error': err})

    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.ticket_watcher_rules WHERE id = %s", (rule_id,))
    if not cur.fetchone():
        cur.close()
        return response(404, {'error': 'Правило не найдено'})

    cur.execute(f"""
        UPDATE {SCHEMA}.ticket_watcher_rules
        SET name=%s, description=%s, is_active=%s,
            trigger_on_create=%s, trigger_on_update=%s, trigger_on_executor_change=%s,
            category_id=%s, department_id=%s, priority_id=%s, executor_group_id=%s,
            assignee_id=%s, match_mode=%s,
            updated_at = NOW()
        WHERE id = %s
    """, (
        (body.get('name') or '').strip(),
        body.get('description'),
        bool(body.get('is_active', True)),
        bool(body.get('trigger_on_create', True)),
        bool(body.get('trigger_on_update', False)),
        bool(body.get('trigger_on_executor_change', False)),
        safe_int(body.get('category_id')),
        safe_int(body.get('department_id')),
        safe_int(body.get('priority_id')),
        safe_int(body.get('executor_group_id')),
        safe_int(body.get('assignee_id')),
        _normalize_match_mode(body.get('match_mode')),
        rule_id,
    ))

    cur.execute(f"DELETE FROM {SCHEMA}.ticket_watcher_rule_targets WHERE rule_id = %s", (rule_id,))
    for t in _normalize_targets(body.get('targets')):
        cur.execute(f"""
            INSERT INTO {SCHEMA}.ticket_watcher_rule_targets (rule_id, target_type, target_id)
            VALUES (%s,%s,%s)
            ON CONFLICT (rule_id, target_type, target_id) DO NOTHING
        """, (rule_id, t['target_type'], t['target_id']))

    conn.commit()
    cur.close()
    return get_rule(conn, rule_id)


def delete_rule(conn, rule_id: int):
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.ticket_watcher_rule_targets WHERE rule_id = %s", (rule_id,))
    cur.execute(f"DELETE FROM {SCHEMA}.ticket_watcher_rules WHERE id = %s RETURNING id", (rule_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    if not deleted:
        return response(404, {'error': 'Правило не найдено'})
    return response(200, {'success': True, 'id': rule_id})


def get_reference(conn):
    cur = conn.cursor()
    cur.execute(f"SELECT id, name FROM {SCHEMA}.ticket_categories ORDER BY name")
    categories = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.departments WHERE COALESCE(is_active,true) = true ORDER BY name")
    departments = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.ticket_priorities ORDER BY level, name")
    priorities = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.executor_groups WHERE is_active = true ORDER BY name")
    groups = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, full_name AS name, email FROM {SCHEMA}.users WHERE is_active = true ORDER BY full_name")
    users = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT id, name FROM {SCHEMA}.roles ORDER BY name")
    roles = [dict(r) for r in cur.fetchall()]

    cur.close()
    return response(200, {
        'categories': categories,
        'departments': departments,
        'priorities': priorities,
        'executor_groups': groups,
        'users': users,
        'roles': roles,
    })


def _resolve_target_user_ids(cur, targets: List[Dict[str, Any]]) -> List[int]:
    user_ids: set = set()
    user_targets = [t['target_id'] for t in targets if t['target_type'] == 'user']
    group_targets = [t['target_id'] for t in targets if t['target_type'] == 'group']
    role_targets = [t['target_id'] for t in targets if t['target_type'] == 'role']

    for uid in user_targets:
        if uid:
            user_ids.add(int(uid))

    if group_targets:
        ids_csv = ','.join(str(int(x)) for x in group_targets)
        cur.execute(f"""
            SELECT user_id FROM {SCHEMA}.executor_group_members
            WHERE group_id IN ({ids_csv})
        """)
        for r in cur.fetchall():
            user_ids.add(int(r['user_id']))

    if role_targets:
        ids_csv = ','.join(str(int(x)) for x in role_targets)
        cur.execute(f"""
            SELECT ur.user_id FROM {SCHEMA}.user_roles ur
            WHERE ur.role_id IN ({ids_csv})
        """)
        for r in cur.fetchall():
            user_ids.add(int(r['user_id']))

    return list(user_ids)


def apply_rules(conn, body: Dict[str, Any]):
    ticket_id = safe_int(body.get('ticket_id'))
    trigger = (body.get('trigger') or 'create').strip()
    if not ticket_id:
        return response(400, {'error': 'ticket_id обязателен'})
    if trigger not in ('create', 'update'):
        return response(400, {'error': 'trigger должен быть create или update'})

    cur = conn.cursor()
    cur.execute(f"""
        SELECT id, category_id, department_id, priority_id, executor_group_id, assigned_to, created_by
        FROM {SCHEMA}.tickets WHERE id = %s
    """, (ticket_id,))
    ticket = cur.fetchone()
    if not ticket:
        cur.close()
        return response(404, {'error': 'Заявка не найдена'})

    trigger_field = 'trigger_on_create' if trigger == 'create' else 'trigger_on_update'
    cur.execute(f"""
        SELECT id, category_id, department_id, priority_id, executor_group_id, assignee_id, match_mode
        FROM {SCHEMA}.ticket_watcher_rules
        WHERE is_active = true AND {trigger_field} = true
    """)
    rules = [dict(r) for r in cur.fetchall()]

    matched_ids: List[int] = [r['id'] for r in rules if _rule_matches_ticket(r, ticket)]

    added: List[int] = []
    if matched_ids:
        ids_csv = ','.join(str(int(x)) for x in matched_ids)
        cur.execute(f"""
            SELECT rule_id, target_type, target_id
            FROM {SCHEMA}.ticket_watcher_rule_targets
            WHERE rule_id IN ({ids_csv})
        """)
        targets = [dict(t) for t in cur.fetchall()]
        user_ids = _resolve_target_user_ids(cur, targets)
        creator_id = ticket.get('created_by')
        for uid in user_ids:
            if creator_id and uid == creator_id:
                continue
            cur.execute(f"""
                INSERT INTO {SCHEMA}.ticket_watchers (ticket_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT (ticket_id, user_id) DO NOTHING
                RETURNING user_id
            """, (ticket_id, uid))
            row = cur.fetchone()
            if row:
                added.append(int(row['user_id']))

    conn.commit()

    # Битрикс-уведомления для новых наблюдателей, добавленных по правилам
    if added:
        try:
            from bitrix_bot_notifier import notify_watcher_added
            app_origin = (body.get('app_origin') if isinstance(body, dict) else '') or ''
            for uid in added:
                try:
                    notify_watcher_added(cur, SCHEMA, int(ticket_id), int(uid), app_origin=app_origin)
                except Exception as bot_err:
                    print(f"[bitrix-bot] watcher rule notification failed t={ticket_id} u={uid}: {bot_err}")
        except Exception as imp_err:
            print(f"[bitrix-bot] import notifier failed: {imp_err}")

    cur.close()
    return response(200, {
        'success': True,
        'ticket_id': ticket_id,
        'matched_rules': matched_ids,
        'added_user_ids': added,
    })


def apply_executor_change(conn, body: Dict[str, Any]):
    """Применить правила с trigger_on_executor_change=true к смене исполнителя.

    Добавляет в наблюдатели бывшего исполнителя + всех адресатов из блока «То»
    каждого подходящего активного правила. Условия «Если» учитываются: если
    у правила есть фильтры — должны совпасть с заявкой.
    """
    ticket_id = safe_int(body.get('ticket_id'))
    previous_assignee = safe_int(body.get('previous_assignee_id'))
    new_assignee = safe_int(body.get('new_assignee_id'))
    if not ticket_id:
        return response(400, {'error': 'ticket_id обязателен'})

    cur = conn.cursor()
    cur.execute(f"""
        SELECT id, category_id, department_id, priority_id, executor_group_id, assigned_to, created_by
        FROM {SCHEMA}.tickets WHERE id = %s
    """, (ticket_id,))
    ticket = cur.fetchone()
    if not ticket:
        cur.close()
        return response(404, {'error': 'Заявка не найдена'})

    cur.execute(f"""
        SELECT id, category_id, department_id, priority_id, executor_group_id, assignee_id, match_mode
        FROM {SCHEMA}.ticket_watcher_rules
        WHERE is_active = true AND trigger_on_executor_change = true
    """)
    rules = [dict(r) for r in cur.fetchall()]

    # Для триггера смены исполнителя сравниваем условие assignee_id с НОВЫМ исполнителем.
    compare_assignee = new_assignee if new_assignee else ticket.get('assigned_to')

    matched_ids: List[int] = [
        r['id'] for r in rules if _rule_matches_ticket(r, ticket, assignee_override=compare_assignee)
    ]

    if not matched_ids:
        cur.close()
        return response(200, {'success': True, 'matched_rules': [], 'added_user_ids': []})

    user_ids: set = set()
    if previous_assignee:
        user_ids.add(int(previous_assignee))

    ids_csv = ','.join(str(int(x)) for x in matched_ids)
    cur.execute(f"""
        SELECT rule_id, target_type, target_id
        FROM {SCHEMA}.ticket_watcher_rule_targets
        WHERE rule_id IN ({ids_csv})
    """)
    targets = [dict(t) for t in cur.fetchall()]
    for uid in _resolve_target_user_ids(cur, targets):
        user_ids.add(int(uid))

    creator_id = ticket.get('created_by')
    added: List[int] = []
    for uid in user_ids:
        if not uid:
            continue
        if creator_id and uid == creator_id:
            continue
        if new_assignee and uid == new_assignee:
            continue
        cur.execute(f"""
            INSERT INTO {SCHEMA}.ticket_watchers (ticket_id, user_id)
            VALUES (%s, %s)
            ON CONFLICT (ticket_id, user_id) DO NOTHING
            RETURNING user_id
        """, (ticket_id, uid))
        row = cur.fetchone()
        if row:
            added.append(int(row['user_id']))

    conn.commit()

    # Битрикс-уведомления для новых наблюдателей (смена исполнителя по правилам)
    if added:
        try:
            from bitrix_bot_notifier import notify_watcher_added
            app_origin = (body.get('app_origin') if isinstance(body, dict) else '') or ''
            for uid in added:
                try:
                    notify_watcher_added(cur, SCHEMA, int(ticket_id), int(uid), app_origin=app_origin)
                except Exception as bot_err:
                    print(f"[bitrix-bot] exec change watcher notif failed t={ticket_id} u={uid}: {bot_err}")
        except Exception as imp_err:
            print(f"[bitrix-bot] import notifier failed: {imp_err}")

    cur.close()
    return response(200, {
        'success': True,
        'ticket_id': ticket_id,
        'matched_rules': matched_ids,
        'added_user_ids': added,
    })


def backfill_rules(conn, body: Dict[str, Any]):
    """Однократный прогон правил trigger_on_create по уже существующим заявкам.

    Параметры body (опционально):
      - rule_id (int): применить только одно правило (иначе — все активные с trigger_on_create=true)
      - ticket_status_ids (list[int]): ограничить статусами заявок (по умолчанию — все)
      - dry_run (bool): только посчитать совпадения, не вставлять в ticket_watchers
      - send_notifications (bool, default false): слать ли Битрикс-уведомления добавленным наблюдателям
      - limit (int): максимум заявок (по умолчанию без лимита)
    """
    rule_id = safe_int(body.get('rule_id'))
    raw_statuses = body.get('ticket_status_ids') or []
    status_ids: List[int] = []
    if isinstance(raw_statuses, list):
        for v in raw_statuses:
            try:
                iv = int(v)
                if iv > 0:
                    status_ids.append(iv)
            except (TypeError, ValueError):
                continue
    dry_run = bool(body.get('dry_run', False))
    send_notifications = bool(body.get('send_notifications', False))
    app_origin = (body.get('app_origin') or '').rstrip('/')
    try:
        limit = int(body.get('limit') or 0)
    except (TypeError, ValueError):
        limit = 0

    cur = conn.cursor()

    rule_filter_sql = ''
    if rule_id:
        rule_filter_sql = f' AND id = {int(rule_id)}'
    cur.execute(f"""
        SELECT id, category_id, department_id, priority_id, executor_group_id, assignee_id, match_mode
        FROM {SCHEMA}.ticket_watcher_rules
        WHERE is_active = true AND trigger_on_create = true{rule_filter_sql}
    """)
    rules = [dict(r) for r in cur.fetchall()]
    if not rules:
        cur.close()
        return response(200, {
            'success': True,
            'message': 'Активных правил с trigger_on_create не найдено',
            'processed_tickets': 0,
            'matched_tickets': 0,
            'added_watchers_total': 0,
            'rules_count': 0,
        })

    rule_ids_csv = ','.join(str(int(r['id'])) for r in rules)
    cur.execute(f"""
        SELECT rule_id, target_type, target_id
        FROM {SCHEMA}.ticket_watcher_rule_targets
        WHERE rule_id IN ({rule_ids_csv})
    """)
    all_targets = [dict(t) for t in cur.fetchall()]

    targets_by_rule: Dict[int, List[Dict[str, Any]]] = {}
    for t in all_targets:
        targets_by_rule.setdefault(int(t['rule_id']), []).append(t)
    resolved_by_rule: Dict[int, List[int]] = {}
    for r_id, t_list in targets_by_rule.items():
        resolved_by_rule[r_id] = _resolve_target_user_ids(cur, t_list)

    status_filter_sql = ''
    if status_ids:
        status_filter_sql = f" AND status_id IN ({','.join(str(s) for s in status_ids)})"
    limit_sql = f' LIMIT {int(limit)}' if limit > 0 else ''

    cur.execute(f"""
        SELECT id, category_id, department_id, priority_id, executor_group_id, assigned_to, created_by
        FROM {SCHEMA}.tickets
        WHERE 1=1{status_filter_sql}
        ORDER BY id ASC
        {limit_sql}
    """)
    tickets = [dict(t) for t in cur.fetchall()]

    processed = 0
    matched_tickets = 0
    added_total = 0
    per_ticket_added: List[Dict[str, Any]] = []
    notify_queue: List[Dict[str, int]] = []

    for ticket in tickets:
        processed += 1
        matched_rule_ids: List[int] = [
            int(r['id']) for r in rules if _rule_matches_ticket(r, ticket)
        ]

        if not matched_rule_ids:
            continue
        matched_tickets += 1

        candidates: set = set()
        for r_id in matched_rule_ids:
            for uid in resolved_by_rule.get(r_id, []):
                if uid:
                    candidates.add(int(uid))

        creator_id = ticket.get('created_by')
        ticket_added: List[int] = []
        for uid in candidates:
            if creator_id and uid == creator_id:
                continue
            if dry_run:
                cur.execute(f"""
                    SELECT 1 FROM {SCHEMA}.ticket_watchers
                    WHERE ticket_id = %s AND user_id = %s
                """, (ticket['id'], uid))
                if cur.fetchone():
                    continue
                ticket_added.append(uid)
            else:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.ticket_watchers (ticket_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT (ticket_id, user_id) DO NOTHING
                    RETURNING user_id
                """, (ticket['id'], uid))
                row = cur.fetchone()
                if row:
                    ticket_added.append(int(row['user_id']))

        if ticket_added:
            added_total += len(ticket_added)
            per_ticket_added.append({
                'ticket_id': ticket['id'],
                'matched_rules': matched_rule_ids,
                'added_user_ids': ticket_added,
            })
            if send_notifications and not dry_run:
                for uid in ticket_added:
                    notify_queue.append({'ticket_id': int(ticket['id']), 'user_id': int(uid)})

    if not dry_run:
        conn.commit()

    if notify_queue:
        try:
            from bitrix_bot_notifier import notify_watcher_added
            for item in notify_queue:
                try:
                    notify_watcher_added(cur, SCHEMA, item['ticket_id'], item['user_id'], app_origin=app_origin)
                except Exception as bot_err:
                    print(f"[backfill] notify failed t={item['ticket_id']} u={item['user_id']}: {bot_err}")
        except Exception as imp_err:
            print(f"[backfill] notifier import failed: {imp_err}")

    cur.close()
    return response(200, {
        'success': True,
        'dry_run': dry_run,
        'rule_id': rule_id,
        'rules_count': len(rules),
        'processed_tickets': processed,
        'matched_tickets': matched_tickets,
        'added_watchers_total': added_total,
        'notifications_sent': len(notify_queue),
        'per_ticket': per_ticket_added[:500],
    })