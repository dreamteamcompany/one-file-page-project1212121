"""
API счётчиков непрочитанного по ролям и типам событий.
GET /tickets-counters → возвращает разбивку по ролям и типам событий для текущего юзера.
"""
import json
from typing import Dict, Any
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA


def handler(event: dict, context) -> dict:
    """Возвращает счётчики непрочитанного для текущего юзера по ролям и событиям"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return handle_options()

    if method != 'GET':
        return response(405, {'error': 'Method not allowed'})

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    user_id = payload['user_id']

    conn = get_db_connection()
    try:
        cur = conn.cursor()

        cur.execute(f"""
            SELECT n.id, n.ticket_id, n.event_type, n.actor_id,
                   t.created_by, t.assigned_to,
                   EXISTS(SELECT 1 FROM {SCHEMA}.ticket_watchers tw
                          WHERE tw.ticket_id = n.ticket_id AND tw.user_id = %s) AS is_watcher,
                   EXISTS(SELECT 1 FROM {SCHEMA}.ticket_approvers ta
                          WHERE ta.ticket_id = n.ticket_id AND ta.approver_id = %s) AS is_approver
            FROM {SCHEMA}.notifications n
            LEFT JOIN {SCHEMA}.tickets t ON t.id = n.ticket_id
            WHERE n.user_id = %s AND n.is_read = false
        """, (user_id, user_id, user_id))

        rows = cur.fetchall()

        by_role = {
            'customer': set(),
            'assignee': set(),
            'watcher': set(),
            'approver': set(),
        }
        by_event = {
            'comment': 0,
            'mention': 0,
            'status_change': 0,
            'deadline_change': 0,
            'assignment_change': 0,
            'acceptance': 0,
            'overdue': 0,
            'other': 0,
        }
        total = 0
        unique_tickets = set()

        for row in rows:
            total += 1
            tid = row['ticket_id']
            if tid:
                unique_tickets.add(tid)

            ev = row['event_type'] or 'other'
            if ev in by_event:
                by_event[ev] += 1
            else:
                by_event['other'] += 1

            if tid:
                if row['created_by'] == user_id:
                    by_role['customer'].add(tid)
                if row['assigned_to'] == user_id:
                    by_role['assignee'].add(tid)
                if row['is_watcher']:
                    by_role['watcher'].add(tid)
                if row['is_approver']:
                    by_role['approver'].add(tid)

        cur.execute(f"""
            SELECT COUNT(*) AS overdue_count
            FROM {SCHEMA}.tickets t
            JOIN {SCHEMA}.ticket_statuses ts ON ts.id = t.status_id
            WHERE t.assigned_to = %s
              AND t.due_date IS NOT NULL
              AND t.due_date < NOW()
              AND COALESCE(ts.is_closed, false) = false
              AND COALESCE(t.is_archived, false) = false
        """, (user_id,))
        overdue_row = cur.fetchone()
        overdue_count = overdue_row['overdue_count'] if overdue_row else 0

        cur.close()

        return response(200, {
            'total': total,
            'unique_tickets': len(unique_tickets),
            'by_role': {k: len(v) for k, v in by_role.items()},
            'by_event': by_event,
            'overdue': overdue_count,
        })
    finally:
        conn.close()
