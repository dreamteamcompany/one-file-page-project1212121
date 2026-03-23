"""
Определяет исполнителя и группу исполнителей для заявки на основе привязок
(executor_user_service_mappings и executor_group_service_mappings).

Приоритет:
1. Индивидуальная привязка пользователя к комбинации (ticket_service + service)
2. Привязка группы → выбирается участник по auto_assign_type:
   - 'all': равномерно по всем участникам (lead в приоритете, least-loaded)
   - 'working': равномерно по работающим сейчас участникам (по графику)
   - 'none': не распределять автоматически
"""
from typing import Optional
from datetime import datetime, timezone, timedelta


def resolve_executor(cur, schema: str, ticket_service_id: Optional[int], service_ids: list[int]) -> Optional[int]:
    if not ticket_service_id or not service_ids:
        return None

    for service_id in service_ids:
        user_id = _find_direct_user(cur, schema, ticket_service_id, service_id)
        if user_id:
            return user_id

        user_id = _find_from_group(cur, schema, ticket_service_id, service_id)
        if user_id:
            return user_id

    return None


def resolve_executor_group(cur, schema: str, ticket_service_id: Optional[int], service_ids: list[int]) -> Optional[int]:
    """Находит подходящую группу исполнителей по маппингу ticket_service + service.
    Возвращает group_id или None."""
    if not ticket_service_id or not service_ids:
        return None

    for service_id in service_ids:
        cur.execute(f"""
            SELECT g.id AS group_id
            FROM {schema}.executor_group_service_mappings m
            JOIN {schema}.executor_groups g ON g.id = m.group_id AND g.is_active = true
            WHERE m.ticket_service_id = %s AND m.service_id = %s
            ORDER BY g.id
            LIMIT 1
        """, (ticket_service_id, service_id))
        row = cur.fetchone()
        if row:
            return row['group_id']

    return None


def _find_direct_user(cur, schema: str, ticket_service_id: int, service_id: int) -> Optional[int]:
    cur.execute(f"""
        SELECT m.user_id
        FROM {schema}.executor_user_service_mappings m
        JOIN {schema}.users u ON u.id = m.user_id AND u.is_active = true
        WHERE m.ticket_service_id = %s AND m.service_id = %s
        LIMIT 1
    """, (ticket_service_id, service_id))
    row = cur.fetchone()
    return row['user_id'] if row else None


def _find_from_group(cur, schema: str, ticket_service_id: int, service_id: int) -> Optional[int]:
    cur.execute(f"""
        SELECT g.id AS group_id, g.auto_assign_type, g.balance_mode
        FROM {schema}.executor_group_service_mappings m
        JOIN {schema}.executor_groups g ON g.id = m.group_id
            AND g.is_active = true
            AND g.auto_assign_type IN ('all', 'working')
        WHERE m.ticket_service_id = %s AND m.service_id = %s
        ORDER BY g.id
        LIMIT 1
    """, (ticket_service_id, service_id))
    group_row = cur.fetchone()
    if not group_row:
        return None

    assign_type = group_row['auto_assign_type']
    balance_mode = group_row.get('balance_mode') or 'none'
    return _pick_member(cur, schema, group_row['group_id'], assign_type, balance_mode)


def _pick_member(cur, schema: str, group_id: int, assign_type: str = 'all', balance_mode: str = 'none') -> Optional[int]:
    now_utc = datetime.now(timezone.utc)
    now_msk = now_utc + timedelta(hours=3)
    current_day = now_msk.weekday()
    current_time = now_msk.strftime('%H:%M:%S')

    if balance_mode == 'balanced':
        subquery = f"""
            SELECT assigned_to, COUNT(*) AS ticket_count
            FROM {schema}.tickets t
            JOIN {schema}.ticket_statuses s ON s.id = t.status_id AND s.count_for_distribution = true
            GROUP BY assigned_to
        """
        select_extra = "COALESCE(tc.ticket_count, 0) AS ticket_count"
        order_clause = "m.is_lead DESC, ticket_count ASC, m.user_id ASC"
    else:
        subquery = f"""
            SELECT assigned_to, MAX(created_at) AS last_assigned_at
            FROM {schema}.tickets
            WHERE assigned_to IS NOT NULL
            GROUP BY assigned_to
        """
        select_extra = "tc.last_assigned_at"
        order_clause = "tc.last_assigned_at ASC NULLS FIRST, m.user_id ASC"

    schedule_join = ""
    params = (group_id,)
    if assign_type == 'working':
        schedule_join = f"""
            JOIN {schema}.work_schedules ws ON ws.user_id = m.user_id
                AND ws.day_of_week = %s
                AND ws.is_active = true
                AND ws.start_time <= %s::time
                AND ws.end_time > %s::time
        """
        params = (current_day, current_time, current_time, group_id)

    cur.execute(f"""
        SELECT m.user_id, m.is_lead, {select_extra}
        FROM {schema}.executor_group_members m
        JOIN {schema}.users u ON u.id = m.user_id AND u.is_active = true
        {schedule_join}
        LEFT JOIN ({subquery}) tc ON tc.assigned_to = m.user_id
        WHERE m.group_id = %s
        ORDER BY {order_clause}
        LIMIT 1
    """, params)

    row = cur.fetchone()
    return row['user_id'] if row else None