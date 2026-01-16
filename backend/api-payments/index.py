"""API для работы с платежами (payments) - минимальная версия"""
import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p67567221_one_file_page_projec')

def response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
            'Access-Control-Max-Age': '86400',
        },
        'body': json.dumps(body, ensure_ascii=False, default=str),
        'isBase64Encoded': False
    }

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        raise Exception('DATABASE_URL not found')
    return psycopg2.connect(dsn, options=f'-c search_path={SCHEMA},public')

def verify_token(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
    if not token:
        return None
    secret = os.environ.get('JWT_SECRET')
    if not secret:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except:
        return None

def handler(event, context):
    """API для payments"""
    
    if event.get('httpMethod') == 'OPTIONS':
        return response(200, {'message': 'OK'})
    
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
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(f"""
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
                FROM {SCHEMA}.payments p
                LEFT JOIN {SCHEMA}.categories c ON p.category_id = c.id
                LEFT JOIN {SCHEMA}.legal_entities le ON p.legal_entity_id = le.id
                LEFT JOIN {SCHEMA}.contractors con ON p.contractor_id = con.id
                LEFT JOIN {SCHEMA}.services s ON p.service_id = s.id
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
