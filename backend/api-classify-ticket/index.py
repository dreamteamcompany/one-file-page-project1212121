"""Классификация заявок через GigaChat с семантическим поиском похожих примеров (оптимизированная версия)"""
import json
import math
import os
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
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

_token_cache = {'token': None, 'expires_at': 0}

SERVICE_KEYWORDS = {
    2: ['1с', '1c', 'база', 'базу', 'базы', 'rdp', 'удалён', 'удален', 'терминал', 'рабочий стол', 'stoma', 'ireland', 'мис'],
    3: ['битрикс', 'bitrix', 'crm', 'портал', 'б24'],
    9: ['почт', 'email', 'mail', 'письм', 'outlook', 'аутлук'],
    10: ['телефон', 'звонок', 'звонк', 'атс', 'гарнитур', 'номер телефон'],
    11: ['отчёт', 'отчет', 'дашборд', 'аналитик', 'статистик', 'bi '],
}

TICKET_TYPE_KEYWORDS = {
    9: ['не могу', 'не работает', 'ошибк', 'сломал', 'проблем', 'не открыва', 'не запуска', 'не подключ', 'зависа', 'тормоз', 'вылетае', 'падает', 'не грузит', 'не загруж'],
    1: ['доступ', 'подключ', 'создать', 'учётк', 'учетк', 'добавить', 'предоставить', 'нужен логин', 'дать права'],
    6: ['заблокир', 'отключить', 'удалить доступ', 'закрыть доступ', 'убрать доступ', 'снять права'],
    10: ['вопрос', 'предложени', 'жалоб', 'как сделать', 'подскажите', 'помогите'],
}

SERVICE_NAMES = {
    2: '1С и удалённый рабочий стол',
    3: 'Битрикс24',
    9: 'Корпоративная почта',
    10: 'Телефония',
    11: 'Аналитика',
}

TICKET_SERVICE_NAMES = {
    1: 'Предоставить доступ',
    6: 'Заблокировать доступ',
    9: 'Сообщить о проблеме',
    10: 'Спросить | Предложить | Жалоба | Иное',
}

TOP_K_EXAMPLES = 5
TOP_K_RULES = 5
AUTO_LEARN_MIN_CONFIDENCE = 90
AUTO_LEARN_DUPLICATE_THRESHOLD = 0.95

EMBEDDING_TIMEOUT = (3, 20)
GIGACHAT_TIMEOUT = (3, 20)
TOKEN_TIMEOUT = (3, 10)


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
    now = time.time()
    if _token_cache['token'] and _token_cache['expires_at'] > now + 60:
        return _token_cache['token']

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
        timeout=TOKEN_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    _token_cache['token'] = data['access_token']
    _token_cache['expires_at'] = data.get('expires_at', now + 1800) / 1000 if data.get('expires_at', 0) > 1000000000000 else data.get('expires_at', now + 1800)
    return _token_cache['token']


def get_embedding_with_token(text, token):
    resp = requests.post(
        'https://gigachat.devices.sberbank.ru/api/v1/embeddings',
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {token}',
        },
        json={
            'model': 'Embeddings',
            'input': [text[:512]],
        },
        verify=False,
        timeout=EMBEDDING_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return data['data'][0]['embedding']


def cosine_similarity(vec_a, vec_b):
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def find_similar_examples(cur, query_embedding, top_k=TOP_K_EXAMPLES):
    cur.execute(f"""
        SELECT e.description, e.ticket_service_id, e.service_ids, e.embedding,
               ts.name as ts_name
        FROM {SCHEMA}.ai_training_examples e
        JOIN {SCHEMA}.ticket_services ts ON ts.id = e.ticket_service_id
        WHERE e.embedding IS NOT NULL
    """)
    examples = [dict(r) for r in cur.fetchall()]

    if not examples:
        return []

    scored = []
    for ex in examples:
        emb = ex['embedding']
        if isinstance(emb, str):
            emb = json.loads(emb)
        if not emb:
            continue
        sim = cosine_similarity(query_embedding, emb)
        scored.append((sim, ex))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:top_k]


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


def build_training_context(cur, query_embedding):
    similar = find_similar_examples(cur, query_embedding)

    examples_text = ''
    if similar:
        svc_ids = set()
        for _, ex in similar:
            if ex['service_ids']:
                svc_ids.update(ex['service_ids'])

        svc_names = {}
        if svc_ids:
            ids_str = ','.join(str(i) for i in svc_ids)
            cur.execute(f"SELECT id, name FROM {SCHEMA}.services WHERE id IN ({ids_str})")
            for r in cur.fetchall():
                svc_names[r['id']] = r['name']

        examples_text = '\nПОХОЖИЕ ЗАЯВКИ:\n'
        for sim_score, ex in similar:
            svc_list = ', '.join([svc_names.get(sid, '?') for sid in (ex['service_ids'] or [])])
            examples_text += f'- (схожесть {sim_score:.0%}) "{ex["description"]}" → услуга "{ex["ts_name"]}" (id={ex["ticket_service_id"]}), сервис: {svc_list} (ids={ex["service_ids"]})\n'

    rules_text = ''
    cur.execute(f"""
        SELECT rule_text FROM {SCHEMA}.ai_training_rules
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT {TOP_K_RULES}
    """)
    rules = [dict(r) for r in cur.fetchall()]

    if rules:
        rules_text = '\nПРАВИЛА:\n'
        for r in rules:
            rules_text += f'- {r["rule_text"]}\n'

    return examples_text, rules_text, len(similar)


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

КАТАЛОГ:
{services_text}
ЗАЯВКА: "{description}"
{rules_text}{examples_text}
JSON: {{"ticket_service_id": ЧИСЛО, "service_ids": [ЧИСЛО], "confidence": 0-100}}
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


def call_gigachat_with_token(prompt, token):
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
        timeout=GIGACHAT_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return data['choices'][0]['message']['content']


FALLBACK_RESULT = {
    'ticket_service_id': None,
    'service_ids': [],
    'ticket_service_name': '',
    'service_names': [],
    'confidence': 0,
    'error': 'Не удалось определить сервис и услугу',
}


def safe_call_gigachat(prompt, token):
    try:
        result = call_gigachat_with_token(prompt, token)
        return result, None
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 0
        error = f'HTTP {status}'
        print(f'[classify] GigaChat failed: {error}')
        if status == 401:
            _token_cache['token'] = None
            _token_cache['expires_at'] = 0
        return None, error
    except requests.exceptions.Timeout as e:
        error = str(e)
        print(f'[classify] GigaChat timeout: {error}')
        return None, error
    except BaseException as e:
        error = str(e)
        print(f'[classify] GigaChat error: {error}')
        return None, error


def safe_get_embedding(text, token):
    try:
        return get_embedding_with_token(text, token), None
    except BaseException as e:
        print(f'[classify] Embedding error: {e}')
        return None, str(e)


def classify_by_keywords(description, services_map):
    desc_lower = description.lower()

    detected_service_ids = []
    for svc_id, keywords in SERVICE_KEYWORDS.items():
        for kw in keywords:
            if kw in desc_lower:
                if svc_id not in detected_service_ids:
                    detected_service_ids.append(svc_id)
                break

    detected_ts_id = None
    best_priority = 999
    priority_order = {9: 1, 1: 2, 6: 3, 10: 4}
    for ts_id, keywords in TICKET_TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in desc_lower:
                p = priority_order.get(ts_id, 99)
                if p < best_priority:
                    best_priority = p
                    detected_ts_id = ts_id
                break

    if not detected_ts_id:
        detected_ts_id = 9

    valid_svc_ids = [s['id'] for s in services_map.get(detected_ts_id, {}).get('services', [])]
    detected_service_ids = [sid for sid in detected_service_ids if sid in valid_svc_ids]

    if not detected_service_ids and valid_svc_ids:
        detected_service_ids = [valid_svc_ids[0]]

    confidence = 0
    if detected_service_ids:
        confidence = 55
    if len(detected_service_ids) == 1:
        confidence = 65

    service_names = [SERVICE_NAMES.get(sid, '') for sid in detected_service_ids]
    ts_name = TICKET_SERVICE_NAMES.get(detected_ts_id, '')

    result = {
        'ticket_service_id': detected_ts_id,
        'service_ids': detected_service_ids,
        'ticket_service_name': ts_name,
        'service_names': service_names,
        'confidence': confidence,
        'fallback': True,
    }

    print(f'[classify] Keyword fallback: ts={detected_ts_id} ({ts_name}), svcs={detected_service_ids}, conf={confidence}')
    return result


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


def classify_with_gigachat(description, ticket_services, services, mappings, examples_text, rules_text, examples_count, token):
    services_map = build_services_map(ticket_services, services, mappings)
    prompt, _, _ = build_prompt(description, services_map, rules_text, examples_text)

    print(f'[classify] Description: {description[:200]}')
    print(f'[classify] Prompt size: {len(prompt)} chars, {examples_count} similar examples')

    raw_content, error = safe_call_gigachat(prompt, token)
    if error or not raw_content:
        print(f'[classify] GigaChat failed: {error}. Using keyword fallback.')
        fallback = classify_by_keywords(description, services_map)
        return fallback, None

    print(f'[classify] GigaChat raw: {raw_content}')

    content = extract_json_from_text(raw_content)
    result = json.loads(content)
    result = validate_result(result, services_map)
    result = enrich_result(result, services_map, services)

    print(f'[classify] Result: ts={result["ticket_service_id"]} ({result["ticket_service_name"]}), svcs={result["service_ids"]}, conf={result.get("confidence")}')
    return result, None


def classify_test_mode(description, ticket_services, services, mappings, examples_text, rules_text, examples_count, token):
    services_map = build_services_map(ticket_services, services, mappings)
    prompt, _, _ = build_prompt(description, services_map, rules_text, examples_text)

    raw_content, error = safe_call_gigachat(prompt, token)
    if error or not raw_content:
        fallback = classify_by_keywords(description, services_map)
        fallback_result = {
            'result': fallback,
            'debug': {
                'prompt': prompt,
                'raw_response': f'GigaChat unavailable: {error}. Used keyword fallback.',
                'examples_count': examples_count,
                'rules_count': rules_text.count('\n- ') if rules_text else 0,
                'examples_text': examples_text.strip() if examples_text else '',
                'rules_text': rules_text.strip() if rules_text else '',
            },
        }
        return fallback_result, None

    content = extract_json_from_text(raw_content)
    result = json.loads(content)
    result = validate_result(result, services_map)
    result = enrich_result(result, services_map, services)

    test_result = {
        'result': result,
        'debug': {
            'prompt': prompt,
            'raw_response': raw_content,
            'examples_count': examples_count,
            'rules_count': rules_text.count('\n- ') if rules_text else 0,
            'examples_text': examples_text.strip() if examples_text else '',
            'rules_text': rules_text.strip() if rules_text else '',
        },
    }
    return test_result, None


def save_log(description, result_data, success, error_message, raw_resp, examples_count, rules_count, duration_ms, test_mode):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {SCHEMA}.ai_classification_logs
            (description, ticket_service_id, ticket_service_name, service_ids, service_names,
             confidence, success, error_message, raw_response, examples_used, rules_used,
             duration_ms, test_mode)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            description[:500],
            result_data.get('ticket_service_id') if result_data else None,
            result_data.get('ticket_service_name', '') if result_data else None,
            result_data.get('service_ids') if result_data else None,
            result_data.get('service_names') if result_data else None,
            result_data.get('confidence') if result_data else None,
            success,
            error_message,
            raw_resp[:2000] if raw_resp else None,
            examples_count,
            rules_count,
            duration_ms,
            test_mode,
        ))
        conn.commit()
        cur.close()
        conn.close()
    except (TypeError, AttributeError, ValueError, RuntimeError) as e:
        print(f'[classify] Failed to save log: {e}')


def auto_learn(description, result, query_embedding):
    if not query_embedding:
        return
    confidence = result.get('confidence', 0)
    if confidence < AUTO_LEARN_MIN_CONFIDENCE:
        return
    if result.get('fallback'):
        return
    ts_id = result.get('ticket_service_id')
    svc_ids = result.get('service_ids', [])
    if not ts_id or not svc_ids:
        return

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(f"""
            SELECT id, embedding FROM {SCHEMA}.ai_training_examples
            WHERE embedding IS NOT NULL
        """)
        existing = [dict(r) for r in cur.fetchall()]

        for ex in existing:
            emb = ex['embedding']
            if isinstance(emb, str):
                emb = json.loads(emb)
            if emb and cosine_similarity(query_embedding, emb) > AUTO_LEARN_DUPLICATE_THRESHOLD:
                print(f'[auto-learn] Duplicate found (id={ex["id"]}), skipping')
                cur.close()
                conn.close()
                return

        embedding_json = json.dumps(query_embedding)
        cur.execute(f"""
            INSERT INTO {SCHEMA}.ai_training_examples
            (description, ticket_service_id, service_ids, embedding, is_auto)
            VALUES (%s, %s, %s, %s::jsonb, true)
        """, (description[:500], ts_id, svc_ids, embedding_json))
        conn.commit()
        cur.close()
        conn.close()
        print(f'[auto-learn] Saved: conf={confidence}, ts={ts_id}, svcs={svc_ids}')
    except BaseException as e:
        print(f'[auto-learn] Error: {e}')


def fetch_catalog_data():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"SELECT id, name FROM {SCHEMA}.ticket_services ORDER BY id")
    ticket_services = [dict(r) for r in cur.fetchall()]
    cur.execute(f"SELECT id, name FROM {SCHEMA}.services ORDER BY id")
    services = [dict(r) for r in cur.fetchall()]
    cur.execute(f"SELECT ticket_service_id, service_id FROM {SCHEMA}.ticket_service_mappings ORDER BY id")
    mappings = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return ticket_services, services, mappings


def fetch_embedding(description, token):
    return safe_get_embedding(description, token)


def handler(event, context):
    """Классификация заявки через GigaChat с семантическим поиском похожих примеров"""
    if event.get('httpMethod') == 'OPTIONS':
        return response(200, '')

    if event.get('httpMethod') != 'POST':
        return response(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body', '{}'))
    description = body.get('description', '').strip()
    test_mode = body.get('test_mode', False)

    if not description:
        return response(400, {'error': 'description обязателен'})

    start_time = time.time()

    try:
        token = get_gigachat_token()
    except BaseException as e:
        print(f'[classify] Token error: {e}. Using keyword-only fallback.')
        token = None

    with ThreadPoolExecutor(max_workers=2) as executor:
        catalog_future = executor.submit(fetch_catalog_data)

        if token:
            embedding_future = executor.submit(fetch_embedding, description, token)
        else:
            embedding_future = None

        ticket_services, services, mappings = catalog_future.result()

        if embedding_future:
            query_embedding, emb_error = embedding_future.result()
        else:
            query_embedding, emb_error = None, 'No token'

    services_map = build_services_map(ticket_services, services, mappings)

    if not token:
        print(f'[classify] No GigaChat token. Using keyword fallback.')
        fallback = classify_by_keywords(description, services_map)
        duration_ms = int((time.time() - start_time) * 1000)
        save_log(description, fallback, False, 'No GigaChat token', None, 0, 0, duration_ms, test_mode)
        if test_mode:
            return response(200, {'result': fallback, 'debug': {'error': 'No GigaChat token'}})
        return response(200, fallback)

    if query_embedding:
        conn = get_db_connection()
        cur = conn.cursor()
        examples_text, rules_text, examples_count = build_training_context(cur, query_embedding)
        cur.close()
        conn.close()
    elif emb_error:
        print(f'[classify] Embedding failed: {emb_error}. Using keyword fallback (skipping GigaChat).')
        fallback = classify_by_keywords(description, services_map)
        duration_ms = int((time.time() - start_time) * 1000)
        save_log(description, fallback, False, f'Embedding failed: {emb_error}', None, 0, 0, duration_ms, test_mode)
        if test_mode:
            return response(200, {'result': fallback, 'debug': {'error': f'Embedding failed: {emb_error}'}})
        return response(200, fallback)
    else:
        examples_text = ''
        examples_count = 0
        rules_text = ''

    error_message = None
    raw_resp = None

    try:
        if test_mode:
            result, error = classify_test_mode(description, ticket_services, services, mappings, examples_text, rules_text, examples_count, token)
            duration_ms = int((time.time() - start_time) * 1000)
            result_data = result.get('result', result)
            raw_resp = result.get('debug', {}).get('raw_response', '')
            save_log(description, result_data, True, None, raw_resp, examples_count, rules_text.count('\n- ') if rules_text else 0, duration_ms, True)
            return response(200, result)
        else:
            result, error = classify_with_gigachat(description, ticket_services, services, mappings, examples_text, rules_text, examples_count, token)
            duration_ms = int((time.time() - start_time) * 1000)
            save_log(description, result, error is None, error, None, examples_count, rules_text.count('\n- ') if rules_text else 0, duration_ms, False)
            auto_learn(description, result, query_embedding)
            return response(200, result)
    except json.JSONDecodeError as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_message = f'JSON parse error: {e}'
        print(f'[classify] {error_message}')
        fallback = classify_by_keywords(description, services_map)
        save_log(description, fallback, False, error_message, None, examples_count, 0, duration_ms, test_mode)
        if test_mode:
            return response(200, {'result': fallback, 'debug': {'error': error_message}})
        return response(200, fallback)
    except BaseException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_message = str(e)
        print(f'[classify] Unexpected error: {error_message}')
        save_log(description, None, False, error_message, None, 0, 0, duration_ms, test_mode)
        return response(500, {'error': 'Ошибка классификации', 'details': error_message})