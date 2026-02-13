"""
API для управления подразделениями с древовидной структурой
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from utils import json_dumps


DSN = os.environ.get('DATABASE_URL')


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(DSN)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query_params = event.get('queryStringParameters') or {}
        dept_id = query_params.get('id')
        
        if method == 'GET':
            if dept_id:
                cur.execute('SELECT * FROM departments WHERE id = %s', (dept_id,))
                dept = cur.fetchone()
                if not dept:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Department not found'}),
                        'isBase64Encoded': False
                    }
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json_dumps(dict(dept)),
                    'isBase64Encoded': False
                }
            else:
                cur.execute(
                    'SELECT * FROM departments WHERE is_active = true ORDER BY company_id, name'
                )
                departments = [dict(row) for row in cur.fetchall()]
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json_dumps(departments),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            cur.execute(
                """
                INSERT INTO departments (company_id, parent_id, name, code, description)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    data.get('company_id'),
                    data.get('parent_id'),
                    data.get('name'),
                    data.get('code'),
                    data.get('description')
                )
            )
            dept = dict(cur.fetchone())
            dept_id = dept['id']
            
            if 'position_ids' in data and data['position_ids']:
                for pos_id in data['position_ids']:
                    cur.execute(
                        'INSERT INTO department_positions (department_id, position_id) VALUES (%s, %s)',
                        (dept_id, pos_id)
                    )
            
            conn.commit()
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json_dumps(dept),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            if not dept_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Department ID required'}),
                    'isBase64Encoded': False
                }
            data = json.loads(event.get('body', '{}'))
            print(f"[PUT] Updating department {dept_id} with data: {data}")
            cur.execute(
                """
                UPDATE departments
                SET company_id = %s, parent_id = %s, name = %s, code = %s, description = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (
                    data.get('company_id'),
                    data.get('parent_id'),
                    data.get('name'),
                    data.get('code'),
                    data.get('description'),
                    dept_id
                )
            )
            print(f"[PUT] Update executed successfully")
            dept = cur.fetchone()
            if not dept:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Department not found'}),
                    'isBase64Encoded': False
                }
            
            if 'position_ids' in data:
                cur.execute('DELETE FROM department_positions WHERE department_id = %s', (dept_id,))
                for pos_id in data['position_ids']:
                    cur.execute(
                        'INSERT INTO department_positions (department_id, position_id) VALUES (%s, %s)',
                        (dept_id, pos_id)
                    )
            
            conn.commit()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json_dumps(dict(dept)),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            if not dept_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Department ID required'}),
                    'isBase64Encoded': False
                }
            cur.execute('SELECT id FROM departments WHERE id = %s AND is_active = true', (dept_id,))
            result = cur.fetchone()
            if not result:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Department not found'}),
                    'isBase64Encoded': False
                }
            cur.execute(
                """
                WITH RECURSIVE descendants AS (
                    SELECT id FROM departments WHERE id = %s
                    UNION ALL
                    SELECT d.id FROM departments d
                    JOIN descendants ds ON d.parent_id = ds.id
                    WHERE d.is_active = true
                )
                UPDATE departments SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id IN (SELECT id FROM descendants)
                """,
                (dept_id,)
            )
            conn.commit()
            return {
                'statusCode': 204,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': '',
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        print(f"[ERROR] Exception occurred: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()