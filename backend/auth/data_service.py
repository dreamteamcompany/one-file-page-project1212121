"""
Сервис данных - получение общих данных приложения
Single Responsibility: только получение данных (не авторизация)
"""
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
    """Получить статистику для дашборда"""
    try:
        cur = conn.cursor()
        
        cur.execute(f"""
            SELECT
                (SELECT COUNT(*) FROM {SCHEMA}.tickets) as total_tickets,
                (SELECT COUNT(*) FROM {SCHEMA}.tickets WHERE status = 'pending') as pending_tickets,
                (SELECT COUNT(*) FROM {SCHEMA}.tickets WHERE status = 'approved') as approved_tickets,
                (SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.payments) as total_payments
        """)
        stats = dict(cur.fetchone())
        cur.close()
        
        return {'status': 200, 'data': stats}
    
    except Exception as e:
        return {'error': str(e), 'status': 500}


def handle_notifications(conn, user_id: int) -> Dict[str, Any]:
    """Получить уведомления пользователя"""
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT id, title, message, type, is_read, created_at
            FROM {SCHEMA}.notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 50
        """, (user_id,))
        
        notifications = cur.fetchall()
        cur.close()
        
        return {'status': 200, 'data': [dict(row) for row in notifications]}
    
    except Exception as e:
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
