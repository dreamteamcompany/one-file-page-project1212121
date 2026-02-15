"""Сервис отслеживания перемещений заявки между группами исполнителей
и фиксации нарушений SLA"""
from typing import Dict, Any, Optional
from shared_utils import SCHEMA


def find_user_group(cur, user_id: int) -> Optional[Dict[str, Any]]:
    """Найти группу, в которой состоит исполнитель"""
    cur.execute(f"""
        SELECT eg.id, eg.name
        FROM {SCHEMA}.executor_group_members egm
        JOIN {SCHEMA}.executor_groups eg ON eg.id = egm.group_id AND eg.is_active = true
        WHERE egm.user_id = %s
        ORDER BY egm.is_lead DESC
        LIMIT 1
    """, (user_id,))
    row = cur.fetchone()
    return dict(row) if row else None


def find_ticket_sla(cur, ticket_id: int) -> Optional[Dict[str, Any]]:
    """Найти SLA привязанный к заявке через услуги/сервисы"""
    cur.execute(f"""
        SELECT DISTINCT s.id, s.response_time_minutes, s.resolution_time_minutes
        FROM {SCHEMA}.sla s
        JOIN {SCHEMA}.sla_service_mappings ssm ON s.id = ssm.sla_id
        JOIN {SCHEMA}.ticket_to_service_mappings tsm ON 
            (ssm.ticket_service_id = tsm.ticket_service_id AND ssm.service_id = tsm.service_id)
            OR (ssm.ticket_service_id = tsm.ticket_service_id AND ssm.service_id IS NULL)
            OR (ssm.ticket_service_id IS NULL AND ssm.service_id = tsm.service_id)
        WHERE tsm.ticket_id = %s
        LIMIT 1
    """, (ticket_id,))
    row = cur.fetchone()
    return dict(row) if row else None


def get_group_budget(cur, sla_id: int, group_id: int) -> Optional[Dict[str, Any]]:
    """Получить бюджет группы для SLA"""
    cur.execute(f"""
        SELECT resolution_minutes, response_minutes
        FROM {SCHEMA}.sla_group_budgets
        WHERE sla_id = %s AND executor_group_id = %s
    """, (sla_id, group_id))
    row = cur.fetchone()
    return dict(row) if row else None


def get_active_log_entry(cur, ticket_id: int) -> Optional[Dict[str, Any]]:
    """Получить активную запись журнала (где released_at IS NULL)"""
    cur.execute(f"""
        SELECT id, executor_group_id, assigned_at, budget_minutes
        FROM {SCHEMA}.ticket_group_log
        WHERE ticket_id = %s AND released_at IS NULL
        ORDER BY assigned_at DESC
        LIMIT 1
    """, (ticket_id,))
    row = cur.fetchone()
    return dict(row) if row else None


def close_active_log_entry(cur, ticket_id: int, user_id: Optional[int] = None):
    """Закрыть активную запись журнала, рассчитать время и зафиксировать нарушение"""
    active = get_active_log_entry(cur, ticket_id)
    if not active:
        return

    cur.execute(f"""
        UPDATE {SCHEMA}.ticket_group_log
        SET released_at = CURRENT_TIMESTAMP,
            time_spent_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - assigned_at)) / 60,
            overdue_minutes = GREATEST(0,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - assigned_at)) / 60 - COALESCE(budget_minutes, 999999)
            )
        WHERE id = %s
        RETURNING time_spent_minutes, overdue_minutes, budget_minutes, executor_group_id
    """, (active['id'],))
    result = cur.fetchone()

    if not result:
        return

    if result['budget_minutes'] and result['overdue_minutes'] > 0:
        sla = find_ticket_sla(cur, ticket_id)
        cur.execute(f"""
            INSERT INTO {SCHEMA}.sla_violations
                (ticket_id, violation_type, executor_group_id,
                 budget_minutes, actual_minutes, overdue_minutes, sla_id)
            VALUES (%s, 'group_resolution', %s, %s, %s, %s, %s)
        """, (
            ticket_id,
            result['executor_group_id'],
            result['budget_minutes'],
            int(result['time_spent_minutes']),
            int(result['overdue_minutes']),
            sla['id'] if sla else None
        ))


def open_log_entry(cur, ticket_id: int, group_id: int, user_id: Optional[int] = None):
    """Открыть новую запись журнала для группы"""
    sla = find_ticket_sla(cur, ticket_id)
    budget_minutes = None

    if sla:
        budget = get_group_budget(cur, sla['id'], group_id)
        if budget:
            budget_minutes = budget.get('resolution_minutes')

    cur.execute(f"""
        INSERT INTO {SCHEMA}.ticket_group_log
            (ticket_id, executor_group_id, assigned_by, budget_minutes)
        VALUES (%s, %s, %s, %s)
    """, (ticket_id, group_id, user_id, budget_minutes))


def track_assignment_change(cur, ticket_id: int, old_assigned_to: Optional[int],
                            new_assigned_to: Optional[int], changed_by: Optional[int] = None):
    """Отследить смену исполнителя и обновить журнал перемещений"""
    if old_assigned_to == new_assigned_to:
        return

    old_group = find_user_group(cur, old_assigned_to) if old_assigned_to else None
    new_group = find_user_group(cur, new_assigned_to) if new_assigned_to else None

    old_group_id = old_group['id'] if old_group else None
    new_group_id = new_group['id'] if new_group else None

    if old_group_id == new_group_id:
        return

    if old_group_id:
        close_active_log_entry(cur, ticket_id, changed_by)

    if new_group_id:
        open_log_entry(cur, ticket_id, new_group_id, changed_by)


def track_ticket_closed(cur, ticket_id: int, user_id: Optional[int] = None):
    """Закрыть активную запись при закрытии заявки"""
    close_active_log_entry(cur, ticket_id, user_id)

    sla = find_ticket_sla(cur, ticket_id)
    if not sla:
        return

    cur.execute(f"""
        SELECT created_at, due_date, response_due_date, has_response
        FROM {SCHEMA}.tickets
        WHERE id = %s
    """, (ticket_id,))
    ticket = cur.fetchone()
    if not ticket:
        return

    if ticket['due_date']:
        cur.execute("SELECT CURRENT_TIMESTAMP > %s AS overdue", (ticket['due_date'],))
        if cur.fetchone()['overdue']:
            actual_minutes = int(
                (cur.fetchone()['overdue'] if False else 0) or 0
            )
            cur.execute(f"""
                SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60 AS actual,
                       EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date)) / 60 AS overdue
                FROM {SCHEMA}.tickets WHERE id = %s
            """, (ticket_id,))
            timing = cur.fetchone()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.sla_violations
                    (ticket_id, violation_type, budget_minutes, actual_minutes, overdue_minutes, sla_id)
                VALUES (%s, 'global_resolution', %s, %s, %s, %s)
            """, (
                ticket_id,
                sla['resolution_time_minutes'],
                int(timing['actual']),
                int(timing['overdue']),
                sla['id']
            ))

    if ticket['response_due_date'] and not ticket['has_response']:
        cur.execute(f"""
            SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60 AS actual,
                   EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - response_due_date)) / 60 AS overdue
            FROM {SCHEMA}.tickets WHERE id = %s
        """, (ticket_id,))
        timing = cur.fetchone()
        if timing['overdue'] and timing['overdue'] > 0:
            cur.execute(f"""
                INSERT INTO {SCHEMA}.sla_violations
                    (ticket_id, violation_type, budget_minutes, actual_minutes, overdue_minutes, sla_id)
                VALUES (%s, 'global_response', %s, %s, %s, %s)
            """, (
                ticket_id,
                sla['response_time_minutes'],
                int(timing['actual']),
                int(timing['overdue']),
                sla['id']
            ))
