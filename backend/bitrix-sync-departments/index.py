import json
import os
import requests
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor


def fetch_bitrix_departments(batch_number: int = 0, batch_size: int = 500) -> tuple[List[Dict[str, Any]], bool]:
    """Получает подразделения из Bitrix24 порциями
    
    Args:
        batch_number: Номер порции (0, 1, 2...)
        batch_size: Размер порции (по умолчанию 500)
    
    Returns:
        Tuple из (список подразделений, есть_ли_еще_данные)
    """
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_WEBHOOK_URL не настроен')
    
    all_departments = []
    start_offset = batch_number * batch_size
    
    print(f"Starting Bitrix24 fetch, batch={batch_number}, offset={start_offset}")
    
    while len(all_departments) < batch_size:
        url = f"{webhook_url}department.get"
        current_start = start_offset + len(all_departments)
        
        payload = {
            'START': current_start,
            'sort': 'ID',
            'order': 'ASC'
        }
        
        print(f"POST request to {url} with START={current_start}")
        
        response = requests.post(
            url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        response.raise_for_status()
        
        data = response.json()
        print(f"Response: {json.dumps(data, ensure_ascii=False)[:200]}")
        
        if 'result' not in data or not data['result']:
            print(f"No result in response, stopping")
            break
        
        departments = data['result']
        total = data.get('total', 0)
        
        all_departments.extend(departments)
        print(f"Fetched {len(departments)}/{total} departments, accumulated: {len(all_departments)}")
        
        if current_start + len(departments) >= total:
            print(f"All data fetched (start={current_start} + count={len(departments)} >= total={total})")
            return all_departments, False
        
        if len(all_departments) >= batch_size:
            print(f"Batch limit reached: {len(all_departments)}")
            break
    
    has_more = len(all_departments) == batch_size
    print(f"Batch completed: {len(all_departments)} departments, has_more: {has_more}")
    return all_departments, has_more


def sync_departments_to_db(departments: List[Dict[str, Any]], company_id: int) -> Dict[str, int]:
    """Синхронизирует подразделения из Bitrix24 в базу данных"""
    print(f"Starting DB sync for {len(departments)} departments")
    
    dsn = os.environ.get('DATABASE_URL')
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    
    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Загружаем все существующие подразделения одним запросом
        print("Loading existing departments from DB")
        cursor.execute(f'''
            SELECT id, bitrix_id FROM {schema}.departments 
            WHERE company_id = %s AND bitrix_id IS NOT NULL
        ''', (company_id,))
        
        existing_map = {row['bitrix_id']: row['id'] for row in cursor.fetchall()}
        print(f"Found {len(existing_map)} existing departments in DB")
        
        # Сортируем подразделения: сначала корневые, потом по SORT
        departments_sorted = sorted(departments, key=lambda d: (d.get('PARENT') is not None, d.get('SORT', 500)))
        
        # Инициализируем bitrix_id_map существующими записями
        bitrix_id_map = existing_map.copy()
        updates = []
        inserts = []
        
        # Подготавливаем данные для batch операций
        print("Preparing batch operations")
        for dept in departments_sorted:
            bitrix_id = str(dept.get('ID'))
            name = dept.get('NAME', '')
            parent_bitrix_id = str(dept.get('PARENT')) if dept.get('PARENT') else None
            
            if bitrix_id in existing_map:
                dept_id = existing_map[bitrix_id]
                updates.append((name, None, dept_id))  # parent_id установим во втором проходе
            else:
                inserts.append((company_id, name, f'BITRIX_{bitrix_id}', bitrix_id))
        
        # Batch UPDATE через executemany по чанкам (избегаем таймаутов)
        if updates:
            chunk_size = 500
            total_chunks = (len(updates) + chunk_size - 1) // chunk_size
            print(f"Updating {len(updates)} departments in {total_chunks} chunks")
            
            for i in range(0, len(updates), chunk_size):
                chunk = updates[i:i+chunk_size]
                cursor.executemany(f'''
                    UPDATE {schema}.departments 
                    SET name = %s, parent_id = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                ''', chunk)
                print(f"Updated chunk {i//chunk_size + 1}/{total_chunks}")
        
        # Batch INSERT через executemany по чанкам
        if inserts:
            chunk_size = 500
            total_chunks = (len(inserts) + chunk_size - 1) // chunk_size
            print(f"Inserting {len(inserts)} departments in {total_chunks} chunks")
            
            for i in range(0, len(inserts), chunk_size):
                chunk = inserts[i:i+chunk_size]
                cursor.executemany(f'''
                    INSERT INTO {schema}.departments 
                    (company_id, name, code, bitrix_id, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ''', chunk)
                print(f"Inserted chunk {i//chunk_size + 1}/{total_chunks}")
            
            # Загружаем созданные ID
            cursor.execute(f'''
                SELECT id, bitrix_id FROM {schema}.departments
                WHERE company_id = %s AND bitrix_id IS NOT NULL
            ''', (company_id,))
            bitrix_id_map = {row['bitrix_id']: row['id'] for row in cursor.fetchall()}
        
        # Второй проход - устанавливаем parent_id по чанкам
        print("Setting parent relationships (second pass)")
        parent_updates = []
        for dept in departments_sorted:
            bitrix_id = str(dept.get('ID'))
            parent_bitrix_id = str(dept.get('PARENT')) if dept.get('PARENT') else None
            
            if parent_bitrix_id and parent_bitrix_id in bitrix_id_map:
                parent_id = bitrix_id_map[parent_bitrix_id]
                dept_id = bitrix_id_map.get(bitrix_id)
                
                if dept_id:
                    parent_updates.append((parent_id, dept_id))
        
        if parent_updates:
            chunk_size = 500
            total_chunks = (len(parent_updates) + chunk_size - 1) // chunk_size
            print(f"Updating {len(parent_updates)} parent relationships in {total_chunks} chunks")
            
            for i in range(0, len(parent_updates), chunk_size):
                chunk = parent_updates[i:i+chunk_size]
                cursor.executemany(f'''
                    UPDATE {schema}.departments 
                    SET parent_id = %s
                    WHERE id = %s
                ''', chunk)
                print(f"Updated parents chunk {i//chunk_size + 1}/{total_chunks}")
        
        conn.commit()
        print(f"DB sync completed, {len(bitrix_id_map)} departments synced")
        return bitrix_id_map
        
    except Exception as e:
        print(f"DB sync error: {e}")
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
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, Authorization',
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
        batch_number = body.get('batch_number', 0)
        batch_size = body.get('batch_size', 500)
        
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
        
        departments, has_more = fetch_bitrix_departments(batch_number, batch_size)
        
        if not departments:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'synced_count': 0,
                    'has_more': False,
                    'batch_number': batch_number,
                    'message': 'Нет подразделений для синхронизации'
                }),
                'isBase64Encoded': False
            }
        
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
                'has_more': has_more,
                'batch_number': batch_number,
                'next_batch': batch_number + 1 if has_more else None,
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