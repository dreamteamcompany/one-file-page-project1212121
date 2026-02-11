import json
import os
import requests
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor


def fetch_bitrix_departments() -> List[Dict[str, Any]]:
    """Получает все подразделения из Bitrix24"""
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_WEBHOOK_URL не настроен')
    
    all_departments = []
    start = 0
    
    while True:
        url = f"{webhook_url}/department.get"
        params = {
            'start': start,
            'order': {'SORT': 'ASC'}
        }
        
        response = requests.get(url, params={'params': json.dumps(params)}, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if 'result' not in data:
            break
        
        departments = data['result']
        if not departments:
            break
        
        all_departments.extend(departments)
        
        if len(departments) < 50:
            break
        
        start += 50
    
    return all_departments


def sync_departments_to_db(departments: List[Dict[str, Any]], company_id: int) -> Dict[str, int]:
    """Синхронизирует подразделения из Bitrix24 в базу данных"""
    dsn = os.environ.get('DATABASE_URL')
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    
    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        bitrix_id_map = {}
        
        for dept in departments:
            bitrix_id = dept.get('ID')
            name = dept.get('NAME', '')
            sort_order = dept.get('SORT', 500)
            parent_bitrix_id = dept.get('PARENT')
            
            cursor.execute(f'''
                SELECT id FROM {schema}.departments 
                WHERE bitrix_id = %s AND company_id = %s
            ''', (bitrix_id, company_id))
            
            existing = cursor.fetchone()
            
            parent_id = None
            if parent_bitrix_id and parent_bitrix_id in bitrix_id_map:
                parent_id = bitrix_id_map[parent_bitrix_id]
            
            if existing:
                cursor.execute(f'''
                    UPDATE {schema}.departments 
                    SET name = %s, 
                        parent_id = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id
                ''', (name, parent_id, existing['id']))
                dept_id = existing['id']
            else:
                cursor.execute(f'''
                    INSERT INTO {schema}.departments 
                    (company_id, name, parent_id, code, bitrix_id, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                ''', (company_id, name, parent_id, f'BITRIX_{bitrix_id}', bitrix_id))
                result = cursor.fetchone()
                dept_id = result['id']
            
            bitrix_id_map[bitrix_id] = dept_id
        
        conn.commit()
        return bitrix_id_map
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def handler(event: dict, context) -> dict:
    """API endpoint для синхронизации подразделений из Bitrix24"""
    if isinstance(event, str):
        event = json.loads(event)
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_str = event.get('body', '{}')
        if isinstance(body_str, str):
            body = json.loads(body_str)
        else:
            body = body_str
        company_id = body.get('company_id')
        
        if not company_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'company_id обязателен'}),
                'isBase64Encoded': False
            }
        
        webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
        if not webhook_url:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'BITRIX24_WEBHOOK_URL не настроен в секретах'}),
                'isBase64Encoded': False
            }
        
        departments = fetch_bitrix_departments()
        
        bitrix_id_map = sync_departments_to_db(departments, company_id)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'synced_count': len(bitrix_id_map),
                'departments': list(bitrix_id_map.values())
            }),
            'isBase64Encoded': False
        }
        
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Ошибка синхронизации: {str(e)}'}),
            'isBase64Encoded': False
        }