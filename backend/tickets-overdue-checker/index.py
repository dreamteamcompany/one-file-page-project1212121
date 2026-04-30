"""
Фоновая задача: пометка просроченных заявок и создание уведомлений 'overdue'.
Запускается по расписанию (cron). Идемпотентна — для одной заявки уведомление 'overdue' создаётся один раз в сутки.
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')
SCHEMA = os.environ.get('MAIN_DB_SCHEMA')


def handler(event: dict, context) -> dict:
    """Проверка просроченных заявок и рассылка уведомлений"""
    conn = psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor,
        options=f'-c search_path={SCHEMA},public'
    )
    cur = conn.cursor()

    created_overdue = 0
    notified_users = set()

    try:
        cur.execute(f"""
            SELECT t.id, t.title, t.assigned_to, t.created_by, t.due_date,
                   COALESCE(s.is_closed, false) AS is_closed
            FROM {SCHEMA}.tickets t
            LEFT JOIN {SCHEMA}.ticket_statuses s ON s.id = t.status_id
            WHERE t.due_date IS NOT NULL
              AND t.due_date < NOW()
              AND COALESCE(s.is_closed, false) = false
        """)
        overdue_tickets = cur.fetchall()

        for tk in overdue_tickets:
            ticket_id = tk['id']
            recipients = set()
            if tk['assigned_to']:
                recipients.add(int(tk['assigned_to']))
            if tk['created_by']:
                recipients.add(int(tk['created_by']))

            cur.execute(f"""
                SELECT user_id FROM {SCHEMA}.ticket_watchers WHERE ticket_id = %s
            """, (ticket_id,))
            for w in cur.fetchall():
                if w['user_id']:
                    recipients.add(int(w['user_id']))

            if not recipients:
                continue

            for uid in recipients:
                cur.execute(f"""
                    SELECT 1 FROM {SCHEMA}.notifications
                    WHERE ticket_id = %s
                      AND user_id = %s
                      AND event_type = 'overdue'
                      AND created_at > NOW() - INTERVAL '24 hours'
                    LIMIT 1
                """, (ticket_id, uid))
                if cur.fetchone():
                    continue

                message = f"Заявка #{ticket_id} «{tk['title']}» просрочена"
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.notifications
                        (user_id, ticket_id, type, event_type, message, is_read, created_at)
                    VALUES (%s, %s, 'overdue', 'overdue', %s, false, NOW())
                """, (uid, ticket_id, message))
                created_overdue += 1
                notified_users.add(uid)

        conn.commit()
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'overdue_tickets': len(overdue_tickets),
                'notifications_created': created_overdue,
                'users_notified': len(notified_users),
            })
        }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
    finally:
        cur.close()
        conn.close()
