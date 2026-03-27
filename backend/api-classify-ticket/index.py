"""Классификация заявок с помощью GigaChat Lite"""
import json
import os
import re
import uuid
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

JWT_SECRET = os.environ.get('JWT_SECRET')
DATABASE_URL = os.environ.get('DATABASE_URL')
SCHEMA = os.environ.get('MAIN_DB_SCHEMA')
GIGACHAT_AUTH_KEY = os.environ.get('GIGACHAT_AUTH_KEY')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id, Authorization',
    'Access-Control-Max-Age': '86400',
}


def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, ensure_ascii=False, default=str),
        'isBase64Encoded': False,
    }


def get_db_connection():
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor,
        options=f'-c search_path={SCHEMA},public',
    )


def get_gigachat_token():
    resp = requests.post(
        'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'RqUID': str(uuid.uuid4()),
            'Authorization': f'Basic {GIGACHAT_AUTH_KEY}',
        },
        data={'scope': 'GIGACHAT_API_PERS'},
        verify=False,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()['access_token']


def extract_json_from_text(text):
    text = text.strip()
    if text.startswith('```'):
        lines = text.split('\n')
        json_lines = []
        inside = False
        for line in lines:
            if line.strip().startswith('```') and not inside:
                inside = True
                continue
            elif line.strip().startswith('```') and inside:
                break
            elif inside:
                json_lines.append(line)
        if json_lines:
            text = '\n'.join(json_lines).strip()

    match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return text


def build_training_context(cur):
    """Подгружает примеры и правила из БД для обогащения промпта"""
    examples_text = ''
    cur.execute(f"""
        SELECT e.description, e.ticket_service_id, e.service_ids,
               ts.name as ts_name
        FROM {SCHEMA}.ai_training_examples e
        JOIN {SCHEMA}.ticket_services ts ON ts.id = e.ticket_service_id
        ORDER BY e.created_at DESC
        LIMIT 30
    """)
    examples = [dict(r) for r in cur.fetchall()]

    if examples:
        svc_ids = set()
        for ex in examples:
            if ex['service_ids']:
                svc_ids.update(ex['service_ids'])

        svc_names = {}
        if svc_ids:
            ids_str = ','.join(str(i) for i in svc_ids)
            cur.execute(f"SELECT id, name FROM {SCHEMA}.services WHERE id IN ({ids_str})")
            for r in cur.fetchall():
                svc_names[r['id']] = r['name']

        examples_text = '\nПРИМЕРЫ КЛАССИФИКАЦИИ:\n'
        for ex in examples:
            svc_list = ', '.join([svc_names.get(sid, '?') for sid in (ex['service_ids'] or [])])
            examples_text += f'- "{ex["description"]}" → услуга "{ex["ts_name"]}" (id={ex["ticket_service_id"]}), сервис: {svc_list} (ids={ex["service_ids"]})\n'

    rules_text = ''
    cur.execute(f"""
        SELECT rule_text FROM {SCHEMA}.ai_training_rules
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 20
    """)
    rules = [dict(r) for r in cur.fetchall()]

    if rules:
        rules_text = '\nДОПОЛНИТЕЛЬНЫЕ ПРАВИЛА:\n'
        for r in rules:
            rules_text += f'- {r["rule_text"]}\n'

    return examples_text, rules_text


def build_prompt(description, services_map, rules_text, examples_text):
    services_text = ''
    for ts_id, info in services_map.items():
        svc_list = ', '.join([f'"{s["name"]}" (id={s["id"]})' for s in info['services']])
        services_text += f'  {ts_id}. "{info["name"]}" -> сервисы: {svc_list}\n'

    valid_ts_ids = [str(ts_id) for ts_id in services_map.keys()]
    valid_svc_ids = []
    for info in services_map.values():
        for s in info['services']:
            if str(s['id']) not in valid_svc_ids:
                valid_svc_ids.append(str(s['id']))

    prompt = f"""Классифицируй IT-заявку. Выбери одну услугу и один или несколько сервисов.

КАТАЛОГ УСЛУГ:
{services_text}
ЗАЯВКА: "{description}"

ИНСТРУКЦИЯ:
- Если проблема/ошибка/не работает/сломалось -> услуга "Сообщить о проблеме" (id=9)
- Если нужен доступ/подключить/создать учётку -> услуга "Предоставить доступ" (id=1)
- Если заблокировать/отключить/удалить доступ -> услуга "Заблокировать доступ" (id=6)
- Если вопрос/предложение/жалоба -> услуга "Спросить | Предложить | Жалоба | Иное" (id=10)

ОПРЕДЕЛЕНИЕ СЕРВИСА по ключевым словам:
- 1С, база, процедура, удалёнка, RDP, терминал, рабочий стол -> сервис "1С и удалённый рабочий стол" (id=2)
- Битрикс, CRM, портал, задача, Bitrix -> сервис "Битрикс24" (id=3)
- Почта, email, mail, письмо, Outlook -> сервис "Корпоративная почта" (id=9)
- Телефон, звонок, АТС, номер, гарнитура -> сервис "Телефония" (id=10)
- Отчёт, дашборд, аналитика, статистика, BI -> сервис "Аналитика" (id=11)
{rules_text}{examples_text}
Ответь ТОЛЬКО JSON, без пояснений:
{{"ticket_service_id": ЧИСЛО, "service_ids": [ЧИСЛО], "confidence": 0-100}}

Допустимые ticket_service_id: {', '.join(valid_ts_ids)}
Допустимые service_ids: {', '.join(valid_svc_ids)}"""

    return prompt, valid_ts_ids, valid_svc_ids


def build_services_map(ticket_services, services, mappings):
    services_map = {}
    for ts in ticket_services:
        linked = []
        for m in mappings:
            if m['ticket_service_id'] == ts['id']:
                svc = next((s for s in services if s['id'] == m['service_id']), None)
                if svc:
                    linked.append({'id': svc['id'], 'name': svc['name']})
        if linked:
            services_map[ts['id']] = {
                'name': ts['name'],
                'services': linked,
            }
    return services_map


def call_gigachat(prompt):
    token = get_gigachat_token()
    resp = requests.post(
        'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {token}',
        },
        json={
            'model': 'GigaChat',
            'messages': [
                {'role': 'system', 'content': 'Ты — классификатор IT-заявок. Отвечай только JSON без пояснений.'},
                {'role': 'user', 'content': prompt},
            ],
            'temperature': 0.1,
            'max_tokens': 100,
        },
        verify=False,
        timeout=45,
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content'].strip()


def validate_result(result, services_map):
    valid_ts_id_list = [ts_id for ts_id in services_map.keys()]
    valid_svc_id_list = [s['id'] for info in services_map.values() for s in info['services']]

    if result.get('ticket_service_id') not in valid_ts_id_list:
        print(f'[classify] Invalid ticket_service_id: {result.get("ticket_service_id")}')
        result['ticket_service_id'] = valid_ts_id_list[0] if valid_ts_id_list else None
        result['confidence'] = 0

    raw_svc_ids = result.get('service_ids', [])
    if not isinstance(raw_svc_ids, list):
        raw_svc_ids = [raw_svc_ids] if isinstance(raw_svc_ids, int) else []
    result['service_ids'] = [sid for sid in raw_svc_ids if sid in valid_svc_id_list]

    if not result['service_ids']:
        ts_services = services_map.get(result['ticket_service_id'], {}).get('services', [])
        if ts_services:
            result['service_ids'] = [ts_services[0]['id']]
            result['confidence'] = min(result.get('confidence', 0), 30)

    return result


def enrich_result(result, services_map, services):
    ts_info = services_map.get(result['ticket_service_id'], {})
    result['ticket_service_name'] = ts_info.get('name', '')
    result['service_names'] = []
    for sid in result['service_ids']:
        svc = next((s for s in services if s['id'] == sid), None)
        if svc:
            result['service_names'].append(svc['name'])
    return result


def classify_with_gigachat(description, ticket_services, services, mappings, examples_text, rules_text):
    services_map = build_services_map(ticket_services, services, mappings)
    prompt, _, _ = build_prompt(description, services_map, rules_text, examples_text)

    print(f'[classify] Description: {description[:200]}')
    print(f'[classify] Training: {len(examples_text)} chars examples, {len(rules_text)} chars rules')

    raw_content = call_gigachat(prompt)
    print(f'[classify] GigaChat raw: {raw_content}')

    content = extract_json_from_text(raw_content)
    result = json.loads(content)
    result = validate_result(result, services_map)
    result = enrich_result(result, services_map, services)

    print(f'[classify] Result: ts={result["ticket_service_id"]} ({result["ticket_service_name"]}), svcs={result["service_ids"]}, conf={result.get("confidence")}')
    return result


def classify_test_mode(description, ticket_services, services, mappings, examples_text, rules_text):
    services_map = build_services_map(ticket_services, services, mappings)
    prompt, _, _ = build_prompt(description, services_map, rules_text, examples_text)

    raw_content = call_gigachat(prompt)
    content = extract_json_from_text(raw_content)
    result = json.loads(content)
    result = validate_result(result, services_map)
    result = enrich_result(result, services_map, services)

    return {
        'result': result,
        'debug': {
            'prompt': prompt,
            'raw_response': raw_content,
            'examples_count': examples_text.count('\n- ') if examples_text else 0,
            'rules_count': rules_text.count('\n- ') if rules_text else 0,
            'examples_text': examples_text.strip() if examples_text else '',
            'rules_text': rules_text.strip() if rules_text else '',
        },
    }


def handler(event, context):
    """Классификация заявки по описанию через GigaChat Lite с обучением"""
    if event.get('httpMethod') == 'OPTIONS':
        return response(200, {})

    if event.get('httpMethod') != 'POST':
        return response(405, {'error': 'Method not allowed'})

    if not GIGACHAT_AUTH_KEY:
        return response(500, {'error': 'GIGACHAT_AUTH_KEY not configured'})

    body = json.loads(event.get('body', '{}'))
    description = body.get('description', '').strip()
    test_mode = body.get('test_mode', False)

    if not description:
        return response(400, {'error': 'description is required'})

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute('SELECT id, name, description FROM ticket_services ORDER BY id')
    ticket_services = [dict(r) for r in cur.fetchall()]

    cur.execute('SELECT id, name, description FROM services ORDER BY id')
    services = [dict(r) for r in cur.fetchall()]

    cur.execute('SELECT ticket_service_id, service_id FROM ticket_service_mappings')
    mappings = [dict(r) for r in cur.fetchall()]

    examples_text, rules_text = build_training_context(cur)

    cur.close()
    conn.close()

    try:
        if test_mode:
            result = classify_test_mode(description, ticket_services, services, mappings, examples_text, rules_text)
        else:
            result = classify_with_gigachat(description, ticket_services, services, mappings, examples_text, rules_text)
        return response(200, result)
    except json.JSONDecodeError as e:
        print(f'[classify] JSON parse error: {e}')
        return response(500, {'error': 'Не удалось распознать ответ ИИ'})
    except requests.exceptions.Timeout:
        print('[classify] Timeout')
        return response(504, {'error': 'Таймаут ответа от ИИ'})
    except requests.exceptions.RequestException as e:
        print(f'[classify] Request error: {e}')
        return response(502, {'error': f'Ошибка связи с ИИ: {str(e)}'})
    except (KeyError, IndexError) as e:
        print(f'[classify] Parse error: {e}')
        return response(500, {'error': 'Неожиданный формат ответа от ИИ'})