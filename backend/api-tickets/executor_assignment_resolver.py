"""
Определяет исполнителя для заявки на основе привязок
(executor_user_service_mappings и executor_group_service_mappings).

Приоритет:
1. Индивидуальная привязка пользователя к комбинации (ticket_service + service)
2. Привязка группы → выбирается участник (lead в приоритете, затем round-robin)
"""
from typing import Optional


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
        SELECT g.id AS group_id
        FROM {schema}.executor_group_service_mappings m
        JOIN {schema}.executor_groups g ON g.id = m.group_id
            AND g.is_active = true
            AND g.auto_assign = true
        WHERE m.ticket_service_id = %s AND m.service_id = %s
        ORDER BY g.id
        LIMIT 1
    """, (ticket_service_id, service_id))
    group_row = cur.fetchone()
    if not group_row:
        return None

    return _pick_member(cur, schema, group_row['group_id'])


def _pick_member(cur, schema: str, group_id: int) -> Optional[int]:
    cur.execute(f"""
        SELECT m.user_id, m.is_lead,
               COALESCE(tc.open_count, 0) AS open_count
        FROM {schema}.executor_group_members m
        JOIN {schema}.users u ON u.id = m.user_id AND u.is_active = true
        LEFT JOIN (
            SELECT assigned_to, COUNT(*) AS open_count
            FROM {schema}.tickets t
            JOIN {schema}.ticket_statuses s ON s.id = t.status_id AND s.is_open = true
            GROUP BY assigned_to
        ) tc ON tc.assigned_to = m.user_id
        WHERE m.group_id = %s
        ORDER BY m.is_lead DESC, open_count ASC, m.user_id ASC
        LIMIT 1
    """, (group_id,))
    row = cur.fetchone()
    return row['user_id'] if row else None
