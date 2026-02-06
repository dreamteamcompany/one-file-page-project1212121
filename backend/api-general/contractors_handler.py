import json
import sys
import os
from models import ContractorRequest
from shared_utils import response

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def handle_contractors(method, event, conn):
    cur = conn.cursor()
    try:
        if method == 'GET':
            cur.execute(f"SELECT * FROM {SCHEMA}.contractors ORDER BY id")
            contractors = cur.fetchall()
            return response(200, [dict(c) for c in contractors])
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            req = ContractorRequest(**body)
            
            cur.execute(f"""
                INSERT INTO {SCHEMA}.contractors 
                (name, inn, kpp, ogrn, legal_address, actual_address, phone, email, 
                 contact_person, bank_name, bank_bik, bank_account, correspondent_account, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (req.name, req.inn, req.kpp, req.ogrn, req.legal_address, req.actual_address,
                  req.phone, req.email, req.contact_person, req.bank_name, req.bank_bik,
                  req.bank_account, req.correspondent_account, req.notes))
            contractor_id = cur.fetchone()['id']
            conn.commit()
            return response(201, {'id': contractor_id, 'message': 'Contractor created'})
        
        elif method == 'PUT':
            params = event.get('queryStringParameters', {}) or {}
            contractor_id = params.get('id')
            if not contractor_id:
                return response(400, {'error': 'Contractor ID required'})
            
            body = json.loads(event.get('body', '{}'))
            req = ContractorRequest(**body)
            
            cur.execute(f"""
                UPDATE {SCHEMA}.contractors SET 
                name=%s, inn=%s, kpp=%s, ogrn=%s, legal_address=%s, actual_address=%s,
                phone=%s, email=%s, contact_person=%s, bank_name=%s, bank_bik=%s,
                bank_account=%s, correspondent_account=%s, notes=%s
                WHERE id=%s
            """, (req.name, req.inn, req.kpp, req.ogrn, req.legal_address, req.actual_address,
                  req.phone, req.email, req.contact_person, req.bank_name, req.bank_bik,
                  req.bank_account, req.correspondent_account, req.notes, contractor_id))
            conn.commit()
            return response(200, {'message': 'Contractor updated'})
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {}) or {}
            contractor_id = params.get('id')
            if not contractor_id:
                return response(400, {'error': 'Contractor ID required'})
            
            cur.execute(f"DELETE FROM {SCHEMA}.contractors WHERE id=%s", (contractor_id,))
            conn.commit()
            return response(200, {'message': 'Contractor deleted'})
        
        else:
            return response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        conn.rollback()
        log(f"Error in handle_contractors: {str(e)}")
        return response(500, {'error': str(e)})
    finally:
        cur.close()
