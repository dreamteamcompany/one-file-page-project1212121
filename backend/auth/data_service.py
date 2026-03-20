"""
Сервис данных - получение общих данных приложения
Single Responsibility: только получение данных (не авторизация)
"""
import json
import os
from typing import Dict, Any

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')


def handle_budget_breakdown(conn) -> Dict[str, Any]:
    """Получить разбивку бюджета по категориям"""
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT 
                c.name as category,
                c.icon,
                COALESCE(SUM(p.amount), 0) as total
            FROM {SCHEMA}.categories c
            LEFT JOIN {SCHEMA}.payments p ON c.id = p.category_id
            GROUP BY c.id, c.name, c.icon
            ORDER BY total DESC
        """)
        
        breakdown = cur.fetchall()
        cur.close()
        
        return {'status': 200, 'data': [dict(row) for row in breakdown]}
    
    except Exception as e:
        return {'error': str(e), 'status': 500}


def handle_dashboard_stats(conn) -> Dict[str, Any]:
    """Получить статистику для дашборда: расходы, количество, динамика"""
    try:
        cur = conn.cursor()

        cur.execute(f"""
            SELECT
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_count
            FROM {SCHEMA}.payments
        """)
        current = dict(cur.fetchone())

        cur.execute(f"""
            SELECT COALESCE(SUM(amount), 0) as prev_amount
            FROM {SCHEMA}.payments
            WHERE created_at >= (date_trunc('month', CURRENT_DATE) - interval '1 month')
              AND created_at < date_trunc('month', CURRENT_DATE)
        """)
        prev = cur.fetchone()
        prev_amount = float(prev['prev_amount']) if prev else 0

        total_amount = float(current['total_amount'])
        if prev_amount > 0:
            change_percent = round(((total_amount - prev_amount) / prev_amount) * 100, 1)
        else:
            change_percent = 0

        cur.close()

        return {
            'status': 200,
            'data': {
                'total_amount': total_amount,
                'total_count': current['total_count'],
                'change_percent': abs(change_percent),
                'is_increase': change_percent > 0
            }
        }

    except Exception as e:
        return {'error': str(e), 'status': 500}


def handle_notifications(conn, user_id: int) -> Dict[str, Any]:
    """Получить уведомления пользователя"""
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT n.id, n.ticket_id, n.type, n.message, n.is_read, n.created_at,
                   t.title as ticket_title
            FROM {SCHEMA}.notifications n
            LEFT JOIN {SCHEMA}.tickets t ON n.ticket_id = t.id
            WHERE n.user_id = %s
            ORDER BY n.created_at DESC
            LIMIT 50
        """, (user_id,))
        
        notifications = [dict(row) for row in cur.fetchall()]

        cur.execute(f"""
            SELECT COUNT(*) as cnt
            FROM {SCHEMA}.notifications
            WHERE user_id = %s AND is_read = false
        """, (user_id,))
        unread_count = cur.fetchone()['cnt']
        cur.close()
        
        return {'status': 200, 'data': {'notifications': notifications, 'unread_count': unread_count}}
    
    except Exception as e:
        return {'error': str(e), 'status': 500}


def handle_mark_notifications_read(conn, user_id: int, event: dict) -> Dict[str, Any]:
    """Пометить уведомления как прочитанные"""
    try:
        body = json.loads(event.get('body') or '{}')
        cur = conn.cursor()

        if body.get('mark_all'):
            cur.execute(f"""
                UPDATE {SCHEMA}.notifications
                SET is_read = true, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND is_read = false
            """, (user_id,))
        elif body.get('notification_ids'):
            ids = body['notification_ids']
            placeholders = ','.join(['%s'] * len(ids))
            cur.execute(f"""
                UPDATE {SCHEMA}.notifications
                SET is_read = true, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND id IN ({placeholders})
            """, (user_id, *ids))

        conn.commit()
        cur.close()

        return {'status': 200, 'data': {'success': True}}

    except Exception as e:
        conn.rollback()
        return {'error': str(e), 'status': 500}


def handle_ticket_services(conn) -> Dict[str, Any]:
    """Получить список услуг для заявок"""
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT 
                ts.id,
                ts.name,
                ts.category_id,
                tsc.name as category_name
            FROM {SCHEMA}.ticket_services ts
            LEFT JOIN {SCHEMA}.ticket_service_categories tsc ON ts.category_id = tsc.id
            ORDER BY tsc.name, ts.name
        """)
        
        services = cur.fetchall()
        cur.close()
        
        return {'status': 200, 'data': [dict(row) for row in services]}
    
    except Exception as e:
        return {'error': str(e), 'status': 500}


def handle_ticket_service_categories(conn) -> Dict[str, Any]:
    """Получить категории услуг для заявок"""
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT id, name, description
            FROM {SCHEMA}.ticket_service_categories
            ORDER BY name
        """)
        
        categories = cur.fetchall()
        cur.close()
        
        return {'status': 200, 'data': [dict(row) for row in categories]}
    
    except Exception as e:
        return {'error': str(e), 'status': 500}