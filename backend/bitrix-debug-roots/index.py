import json
import os
import requests
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor


CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, Authorization',
    'Access-Control-Max-Age': '86400',
}


def fetch_all_departments(webhook_url: str) -> List[Dict[str, Any]]:
    all_depts: List[Dict[str, Any]] = []
    start = 0
    for _ in range(200):
        resp = requests.post(
            f"{webhook_url}department.get",
            json={'START': start, 'sort': 'ID', 'order': 'ASC'},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        result = data.get('result') or []
        if not result:
            break
        all_depts.extend(result)
        nxt = data.get('next')
        if nxt is None:
            break
        start = int(nxt)
    return all_depts


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """Диагностика корневых подразделений Битрикс24: что приходит из API и что в БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    if not webhook_url:
        return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'no webhook'})}

    report: Dict[str, Any] = {}

    try:
        r1 = requests.post(f"{webhook_url}department.get", json={'ID': 1}, timeout=20)
        report['dept_id_1'] = r1.json()
    except Exception as e:
        report['dept_id_1'] = {'error': str(e)}

    try:
        all_depts = fetch_all_departments(webhook_url)
        report['total_from_bitrix'] = len(all_depts)

        roots = []
        for d in all_depts:
            parent = d.get('PARENT')
            if parent is None or str(parent) in ('0', ''):
                roots.append({'ID': d.get('ID'), 'NAME': d.get('NAME'), 'PARENT': parent})
        report['roots_no_parent'] = roots

        parent_1 = []
        for d in all_depts:
            if str(d.get('PARENT')) == '1':
                parent_1.append({'ID': d.get('ID'), 'NAME': d.get('NAME')})
        report['children_of_id_1'] = parent_1

        all_ids = {str(d.get('ID')) for d in all_depts}
        orphans = []
        for d in all_depts:
            parent = d.get('PARENT')
            if parent and str(parent) not in all_ids and str(parent) != '0':
                orphans.append({'ID': d.get('ID'), 'NAME': d.get('NAME'), 'PARENT': parent})
        report['orphans_parent_missing'] = orphans

        target_names = ['уп', 'ук', 'управля', 'финансово']
        matches = []
        for d in all_depts:
            n = (d.get('NAME') or '').lower()
            if any(t in n for t in target_names):
                matches.append({'ID': d.get('ID'), 'NAME': d.get('NAME'), 'PARENT': d.get('PARENT')})
        report['name_matches'] = matches
    except Exception as e:
        report['fetch_error'] = str(e)

    try:
        dsn = os.environ.get('DATABASE_URL')
        schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
        conn = psycopg2.connect(dsn)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            f"""SELECT id, bitrix_id, name, parent_id, is_archived
                FROM {schema}.departments
                WHERE LOWER(name) LIKE '%управля%'
                   OR LOWER(name) LIKE '%финансово%'
                   OR LOWER(name) = 'ук'
                   OR LOWER(name) LIKE 'ук %'
                ORDER BY id"""
        )
        report['db_matches'] = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        report['db_error'] = str(e)

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps(report, ensure_ascii=False, default=str),
    }
