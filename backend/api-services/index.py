"""
API для работы с сервисами (services)
Облегченная версия для быстрого деплоя
"""
import json
from typing import Dict, Any
from shared_utils import response, get_db_connection, verify_token, handle_options, SCHEMA

def handler(event, context):
    """API эндпоинт для services"""
    
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
            cur.execute(f"""
                SELECT 
                    s.id,
                    s.name,
                    s.description,
                    s.intermediate_approver_id,
                    s.final_approver_id,
                    s.customer_department_id,
                    s.created_at,
                    s.updated_at,
                    u1.full_name as intermediate_approver_name,
                    u2.full_name as final_approver_name,
                    cd.name as customer_department_name
                FROM {SCHEMA}.services s
                LEFT JOIN {SCHEMA}.users u1 ON s.intermediate_approver_id = u1.id
                LEFT JOIN {SCHEMA}.users u2 ON s.final_approver_id = u2.id
                LEFT JOIN {SCHEMA}.customer_departments cd ON s.customer_department_id = cd.id
                ORDER BY s.name
            """)
            
            services = [dict(row) for row in cur.fetchall()]
            cur.close()
            
            return response(200, services)
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            name = body.get('name')
            description = body.get('description', '')
            intermediate_approver_id = body.get('intermediate_approver_id')
            final_approver_id = body.get('final_approver_id')
            customer_department_id = body.get('customer_department_id')
            
            if not name:
                return response(400, {'error': 'Название сервиса обязательно'})
            
            cur = conn.cursor()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.services (
                    name, 
                    description, 
                    intermediate_approver_id, 
                    final_approver_id,
                    customer_department_id,
                    created_at, 
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id, name, description, intermediate_approver_id, 
                          final_approver_id, customer_department_id, created_at, updated_at
            """, (name, description, intermediate_approver_id, final_approver_id, customer_department_id))
            
            new_service = dict(cur.fetchone())
            conn.commit()
            cur.close()
            
            return response(201, new_service)
        
        elif method == 'DELETE':
            service_id = event.get('queryStringParameters', {}).get('id')
            
            if not service_id:
                return response(400, {'error': 'ID сервиса обязателен'})
            
            cur = conn.cursor()
            
            cur.execute(f"""
                SELECT 
                  (SELECT COUNT(*) FROM {SCHEMA}.payments WHERE service_id = %s) as payments_count,
                  (SELECT COUNT(*) FROM {SCHEMA}.savings WHERE service_id = %s) as savings_count,
                  (SELECT COUNT(*) FROM {SCHEMA}.ticket_service_mappings WHERE service_id = %s) as mappings_count
            """, (service_id, service_id, service_id))
            
            counts = cur.fetchone()
            errors = []
            if counts[0] > 0:
                errors.append(f'{counts[0]} платежей')
            if counts[1] > 0:
                errors.append(f'{counts[1]} сохранений')
            if counts[2] > 0:
                errors.append(f'{counts[2]} связей с заявками')
            
            if errors:
                cur.close()
                return response(400, {'error': f'Невозможно удалить: есть {", ".join(errors)}'})
            
            cur.execute(f"DELETE FROM {SCHEMA}.services WHERE id = %s", (service_id,))
            conn.commit()
            cur.close()
            
            return response(200, {'message': 'Сервис удален'})
        
        else:
            return response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        return response(500, {'error': str(e)})
    
    finally:
        try:
            conn.close()
        except:
            pass
