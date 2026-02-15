"""Обработчик аналитики SLA — нарушения, статистика по группам, данные для заявки"""
from typing import Dict, Any
from shared_utils import response, verify_token, SCHEMA


def handle_sla_analytics(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """API аналитики SLA"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    if method != 'GET':
        return response(405, {'error': 'Метод не поддерживается'})

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'dashboard')

    cur = conn.cursor()

    if action == 'dashboard':
        return _get_dashboard(cur, params)
    elif action == 'ticket_group_log':
        return _get_ticket_group_log(cur, params)
    elif action == 'ticket_violations':
        return _get_ticket_violations(cur, params)
    elif action == 'ticket_sla_info':
        return _get_ticket_sla_info(cur, params)

    return response(400, {'error': 'Неизвестный action'})


def _get_dashboard(cur, params: dict) -> Dict[str, Any]:
    date_from = params.get('date_from')
    date_to = params.get('date_to')

    date_filter = ""
    if date_from:
        date_filter += f" AND violated_at >= '{date_from}'"
    if date_to:
        date_filter += f" AND violated_at <= '{date_to}'"

    cur.execute(f"""
        SELECT 
            violation_type,
            COUNT(*) AS count,
            ROUND(AVG(overdue_minutes)) AS avg_overdue_minutes,
            MAX(overdue_minutes) AS max_overdue_minutes
        FROM {SCHEMA}.sla_violations
        WHERE 1=1 {date_filter}
        GROUP BY violation_type
        ORDER BY count DESC
    """)
    by_type = [dict(row) for row in cur.fetchall()]

    cur.execute(f"""
        SELECT 
            sv.executor_group_id,
            eg.name AS group_name,
            COUNT(*) AS violation_count,
            ROUND(AVG(sv.overdue_minutes)) AS avg_overdue_minutes,
            MAX(sv.overdue_minutes) AS max_overdue_minutes
        FROM {SCHEMA}.sla_violations sv
        JOIN {SCHEMA}.executor_groups eg ON sv.executor_group_id = eg.id
        WHERE sv.executor_group_id IS NOT NULL {date_filter}
        GROUP BY sv.executor_group_id, eg.name
        ORDER BY violation_count DESC
    """)
    by_group = [dict(row) for row in cur.fetchall()]

    group_log_filter = ""
    if date_from:
        group_log_filter += f" AND assigned_at >= '{date_from}'"
    if date_to:
        group_log_filter += f" AND assigned_at <= '{date_to}'"

    cur.execute(f"""
        SELECT 
            gl.executor_group_id,
            eg.name AS group_name,
            COUNT(*) AS total_assignments,
            ROUND(AVG(gl.time_spent_minutes)) AS avg_time_minutes,
            SUM(CASE WHEN gl.overdue_minutes > 0 THEN 1 ELSE 0 END) AS overdue_count,
            ROUND(
                100.0 * SUM(CASE WHEN gl.overdue_minutes > 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
                1
            ) AS overdue_percent
        FROM {SCHEMA}.ticket_group_log gl
        JOIN {SCHEMA}.executor_groups eg ON gl.executor_group_id = eg.id
        WHERE gl.released_at IS NOT NULL {group_log_filter}
        GROUP BY gl.executor_group_id, eg.name
        ORDER BY total_assignments DESC
    """)
    group_performance = [dict(row) for row in cur.fetchall()]

    total_violations = sum(item['count'] for item in by_type)

    tickets_filter = ""
    if date_from:
        tickets_filter += f" AND t.created_at >= '{date_from}'"
    if date_to:
        tickets_filter += f" AND t.created_at <= '{date_to}'"

    cur.execute(f"""
        SELECT COUNT(*) AS total 
        FROM {SCHEMA}.tickets t
        WHERE t.due_date IS NOT NULL {tickets_filter}
    """)
    total_with_sla = cur.fetchone()['total']

    cur.execute(f"""
        SELECT COUNT(DISTINCT ticket_id) AS violated_tickets
        FROM {SCHEMA}.sla_violations
        WHERE violation_type IN ('global_resolution', 'global_response') {date_filter}
    """)
    violated_tickets = cur.fetchone()['violated_tickets']

    sla_compliance = round(
        100.0 * (total_with_sla - violated_tickets) / max(total_with_sla, 1), 1
    )

    return response(200, {
        'total_violations': total_violations,
        'sla_compliance_percent': sla_compliance,
        'total_tickets_with_sla': total_with_sla,
        'violated_tickets': violated_tickets,
        'by_type': by_type,
        'by_group': by_group,
        'group_performance': group_performance,
    })


def _get_ticket_group_log(cur, params: dict) -> Dict[str, Any]:
    ticket_id = params.get('ticket_id')
    if not ticket_id:
        return response(400, {'error': 'ticket_id обязателен'})

    cur.execute(f"""
        SELECT 
            gl.id, gl.executor_group_id, gl.assigned_at, gl.released_at,
            gl.time_spent_minutes, gl.budget_minutes, gl.overdue_minutes,
            eg.name AS group_name,
            u.full_name AS assigned_by_name
        FROM {SCHEMA}.ticket_group_log gl
        JOIN {SCHEMA}.executor_groups eg ON gl.executor_group_id = eg.id
        LEFT JOIN {SCHEMA}.users u ON gl.assigned_by = u.id
        WHERE gl.ticket_id = %s
        ORDER BY gl.assigned_at
    """, (int(ticket_id),))

    return response(200, [dict(row) for row in cur.fetchall()])


def _get_ticket_violations(cur, params: dict) -> Dict[str, Any]:
    ticket_id = params.get('ticket_id')
    if not ticket_id:
        return response(400, {'error': 'ticket_id обязателен'})

    cur.execute(f"""
        SELECT 
            sv.id, sv.violation_type, sv.executor_group_id,
            sv.budget_minutes, sv.actual_minutes, sv.overdue_minutes,
            sv.violated_at,
            eg.name AS group_name
        FROM {SCHEMA}.sla_violations sv
        LEFT JOIN {SCHEMA}.executor_groups eg ON sv.executor_group_id = eg.id
        WHERE sv.ticket_id = %s
        ORDER BY sv.violated_at
    """, (int(ticket_id),))

    return response(200, [dict(row) for row in cur.fetchall()])


def _get_ticket_sla_info(cur, params: dict) -> Dict[str, Any]:
    ticket_id = params.get('ticket_id')
    if not ticket_id:
        return response(400, {'error': 'ticket_id обязателен'})

    cur.execute(f"""
        SELECT t.due_date, t.response_due_date, t.has_response, t.created_at,
               t.assigned_to, t.closed_at
        FROM {SCHEMA}.tickets t
        WHERE t.id = %s
    """, (int(ticket_id),))
    ticket = cur.fetchone()
    if not ticket:
        return response(404, {'error': 'Заявка не найдена'})
    ticket = dict(ticket)

    cur.execute(f"""
        SELECT gl.executor_group_id, eg.name AS group_name,
               gl.assigned_at, gl.budget_minutes,
               EXTRACT(EPOCH FROM (COALESCE(gl.released_at, CURRENT_TIMESTAMP) - gl.assigned_at)) / 60
                   AS elapsed_minutes
        FROM {SCHEMA}.ticket_group_log gl
        JOIN {SCHEMA}.executor_groups eg ON gl.executor_group_id = eg.id
        WHERE gl.ticket_id = %s AND gl.released_at IS NULL
        LIMIT 1
    """, (int(ticket_id),))
    active_group = cur.fetchone()

    cur.execute(f"""
        SELECT sv.violation_type, sv.overdue_minutes, sv.violated_at,
               eg.name AS group_name
        FROM {SCHEMA}.sla_violations sv
        LEFT JOIN {SCHEMA}.executor_groups eg ON sv.executor_group_id = eg.id
        WHERE sv.ticket_id = %s
        ORDER BY sv.violated_at DESC
    """, (int(ticket_id),))
    violations = [dict(row) for row in cur.fetchall()]

    return response(200, {
        'ticket': ticket,
        'active_group': dict(active_group) if active_group else None,
        'violations': violations,
        'has_violations': len(violations) > 0,
    })
