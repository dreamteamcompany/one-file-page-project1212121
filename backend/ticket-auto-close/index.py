"""
Фоновая задача: автозакрытие заявок, ожидающих подтверждения более 2 дней.
Запускается по расписанию (cron). Закрывает заявки с рейтингом 5 по умолчанию.
v2
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')
SCHEMA = os.environ.get('MAIN_DB_SCHEMA')


def handler(event: dict, context) -> dict:
    """Автозакрытие заявок, ожидающих подтверждения более 2 дней"""
    conn = psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor,
        options=f'-c search_path={SCHEMA},public'
    )
    cur = conn.cursor()

    try:
        # Находим статус "Ожидает подтверждения"
        cur.execute(f"SELECT id FROM {SCHEMA}.ticket_statuses WHERE is_pending_confirmation = TRUE LIMIT 1")
        pending_status = cur.fetchone()
        if not pending_status:
            return {'statusCode': 200, 'body': json.dumps({'message': 'Статус pending_confirmation не найден', 'closed': 0})}

        # Находим закрытый статус
        cur.execute(f"SELECT id FROM {SCHEMA}.ticket_statuses WHERE is_closed = TRUE LIMIT 1")
        closed_status = cur.fetchone()
        if not closed_status:
            return {'statusCode': 200, 'body': json.dumps({'message': 'Закрытый статус не найден', 'closed': 0})}

        # Находим все заявки, которые ожидают подтверждения больше 2 дней
        cur.execute(f"""
            SELECT id, created_by
            FROM {SCHEMA}.tickets
            WHERE status_id = %s
              AND confirmation_sent_at IS NOT NULL
              AND confirmation_sent_at < NOW() - INTERVAL '2 days'
        """, (pending_status['id'],))
        tickets_to_close = cur.fetchall()

        closed_count = 0
        for ticket in tickets_to_close:
            # Закрываем с автооценкой 5 (дедлайн истёк — считаем выполненным)
            cur.execute(f"""
                UPDATE {SCHEMA}.tickets
                SET status_id = %s,
                    rating = 5,
                    updated_at = NOW()
                WHERE id = %s
            """, (closed_status['id'], ticket['id']))

            # Запись в историю
            cur.execute(f"""
                INSERT INTO {SCHEMA}.ticket_history (ticket_id, user_id, field_name, old_value, new_value, created_at)
                VALUES (%s, NULL, 'status_id', %s, %s, NOW())
            """, (ticket['id'], str(pending_status['id']), str(closed_status['id'])))

            closed_count += 1

        conn.commit()
        print(f'[auto-close] Закрыто заявок: {closed_count}')
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'message': f'Закрыто заявок: {closed_count}', 'closed': closed_count})
        }

    finally:
        cur.close()
        conn.close()