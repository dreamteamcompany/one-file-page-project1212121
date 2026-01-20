"""API для работы с платежами (payments) - минимальная версия"""
import json
from typing import Dict, Any
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA

def handler(event, context):
    """API для payments"""
    
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options()
    
    method = event.get('httpMethod', 'GET')
    payload = verify_token(event)
    
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    try:
        conn = get_db_connection()
    except Exception as e:
        return response(500, {'error': 'Database connection failed'})
    
    try:
        if method == 'GET':
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    p.id,
                    p.amount,
                    p.description,
                    p.payment_date,
                    p.created_at,
                    p.status,
                    p.created_by,
                    c.name as category_name,
                    c.icon as category_icon,
                    le.name as legal_entity_name,
                    con.name as contractor_name,
                    s.name as service_name
                FROM payments p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN legal_entities le ON p.legal_entity_id = le.id
                LEFT JOIN contractors con ON p.contractor_id = con.id
                LEFT JOIN services s ON p.service_id = s.id
                ORDER BY p.created_at DESC
                LIMIT 100
            """)
            
            payments = [dict(row) for row in cur.fetchall()]
            cur.close()
            
            return response(200, payments)
        
        else:
            return response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        return response(500, {'error': str(e)})
    
    finally:
        try:
            conn.close()
        except:
            pass
