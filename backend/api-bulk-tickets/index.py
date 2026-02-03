"""
API для массовых операций с заявками
"""
import json
import os
import sys
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional

def log(msg):
    print(msg, file=sys.stderr, flush=True)

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p67567221_one_file_page_projec')

def response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, Authorization',
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
    """API эндпоинт для массовых операций с заявками"""
    
    if event.get('httpMethod') == 'OPTIONS':
        return response(200, {'message': 'OK'})
    
    method = event.get('httpMethod', 'POST')
    
    if method != 'POST':
        return response(405, {'error': 'Только POST метод разрешен'})
    
    payload = verify_token(event)
    
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    
    try:
        conn = get_db_connection()
    except Exception as e:
        return response(500, {'error': 'Database connection failed'})
    
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        ticket_ids = body.get('ticket_ids', [])
        
        log(f"[BULK-TICKETS] Action: {action}, IDs count: {len(ticket_ids)}")
        
        if not ticket_ids:
            return response(400, {'error': 'Не указаны ID заявок'})
        
        if not action:
            return response(400, {'error': 'Не указано действие'})
        
        cur = conn.cursor()
        successful = 0
        
        if action == 'delete':
            # Массовое удаление заявок
            placeholders = ','.join(['%s'] * len(ticket_ids))
            log(f"[BULK-TICKETS] Deleting tickets: {ticket_ids}")
            
            # Удаляем все связанные записи перед удалением заявок
            try:
                cur.execute(f"DELETE FROM {SCHEMA}.notifications WHERE ticket_id IN ({placeholders})", ticket_ids)
                log(f"[BULK-TICKETS] Deleted notifications: {cur.rowcount}")
            except Exception as e:
                log(f"[BULK-TICKETS] Error deleting notifications: {e}")
            
            try:
                cur.execute(f"DELETE FROM {SCHEMA}.ticket_history WHERE ticket_id IN ({placeholders})", ticket_ids)
                log(f"[BULK-TICKETS] Deleted history: {cur.rowcount}")
            except Exception as e:
                log(f"[BULK-TICKETS] Error deleting history: {e}")
            
            try:
                cur.execute(f"DELETE FROM {SCHEMA}.ticket_comments WHERE ticket_id IN ({placeholders})", ticket_ids)
                log(f"[BULK-TICKETS] Deleted comments: {cur.rowcount}")
            except Exception as e:
                log(f"[BULK-TICKETS] Error deleting comments: {e}")
            
            try:
                cur.execute(f"DELETE FROM {SCHEMA}.ticket_to_service_mappings WHERE ticket_id IN ({placeholders})", ticket_ids)
                log(f"[BULK-TICKETS] Deleted service mappings: {cur.rowcount}")
            except Exception as e:
                log(f"[BULK-TICKETS] Error deleting mappings: {e}")
            
            try:
                cur.execute(f"DELETE FROM {SCHEMA}.ticket_custom_field_values WHERE ticket_id IN ({placeholders})", ticket_ids)
                log(f"[BULK-TICKETS] Deleted custom fields: {cur.rowcount}")
            except Exception as e:
                log(f"[BULK-TICKETS] Error deleting custom fields: {e}")
            
            # Теперь удаляем сами заявки
            cur.execute(f"DELETE FROM {SCHEMA}.tickets WHERE id IN ({placeholders})", ticket_ids)
            successful = cur.rowcount
            conn.commit()
            
            log(f"[BULK-TICKETS] Successfully deleted {successful} tickets")
            
            return response(200, {
                'total': len(ticket_ids),
                'successful': successful,
                'message': f'Удалено {successful} заявок'
            })
        
        elif action == 'change_status':
            status_id = body.get('status_id')
            if not status_id:
                return response(400, {'error': 'Не указан status_id'})
            
            placeholders = ','.join(['%s'] * len(ticket_ids))
            cur.execute(f"""
                UPDATE {SCHEMA}.tickets 
                SET status_id = %s, updated_at = NOW() 
                WHERE id IN ({placeholders})
            """, [status_id] + ticket_ids)
            successful = cur.rowcount
            conn.commit()
            
            return response(200, {
                'total': len(ticket_ids),
                'successful': successful,
                'message': f'Обновлено {successful} заявок'
            })
        
        elif action == 'change_priority':
            priority_id = body.get('priority_id')
            if not priority_id:
                return response(400, {'error': 'Не указан priority_id'})
            
            placeholders = ','.join(['%s'] * len(ticket_ids))
            cur.execute(f"""
                UPDATE {SCHEMA}.tickets 
                SET priority_id = %s, updated_at = NOW() 
                WHERE id IN ({placeholders})
            """, [priority_id] + ticket_ids)
            successful = cur.rowcount
            conn.commit()
            
            return response(200, {
                'total': len(ticket_ids),
                'successful': successful,
                'message': f'Обновлено {successful} заявок'
            })
        
        else:
            return response(400, {'error': f'Неизвестное действие: {action}'})
    
    except Exception as e:
        log(f"[BULK-TICKETS] Fatal error: {e}")
        import traceback
        log(traceback.format_exc())
        return response(500, {'error': str(e)})
    
    finally:
        try:
            conn.close()
        except:
            pass