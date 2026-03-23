"""Классификация заявок с помощью GigaChat Lite"""
import json
import os
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
    """Получение токена доступа GigaChat через OAuth"""
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


def classify_with_gigachat(description, ticket_services, services, mappings):
    """Отправка запроса в GigaChat для классификации"""
    token = get_gigachat_token()

    services_map = {}
    for ts in ticket_services:
        linked = []
        for m in mappings:
            if m['ticket_service_id'] == ts['id']:
                svc = next((s for s in services if s['id'] == m['service_id']), None)
                if svc:
                    linked.append({'id': svc['id'], 'name': svc['name']})
        services_map[ts['id']] = {
            'name': ts['name'],
            'services': linked,
        }

    services_text = ''
    for ts_id, info in services_map.items():
        svc_list = ', '.join([f"{s['name']} (id={s['id']})" for s in info['services']])
        services_text += f"- Услуга \"{info['name']}\" (id={ts_id}): сервисы [{svc_list}]\n"

    prompt = f"""Ты — классификатор IT-заявок. Пользователь написал описание проблемы. Определи наиболее подходящую услугу и сервис.

Доступные услуги и их сервисы:
{services_text}

Описание заявки: "{description}"

Ответь СТРОГО в формате JSON (без markdown):
{{"ticket_service_id": число, "service_ids": [число], "confidence": число_от_0_до_100}}

Правила:
- ticket_service_id — ID одной услуги
- service_ids — массив из одного или нескольких ID сервисов
- confidence — уверенность в классификации от 0 до 100
- Если описание про проблему/ошибку/не работает — выбирай "Сообщить о проблеме"
- Если про доступ/подключить/создать — выбирай "Предоставить доступ"
- Если про заблокировать/отключить/удалить доступ — выбирай "Заблокировать доступ"
- Если вопрос/предложение/жалоба — выбирай "Спросить | Предложить | Жалоба | Иное"
- Определяй сервис по ключевым словам: 1С/базы/процедуры/удалёнка → "1С и удалённый рабочий стол", Битрикс/CRM/портал → "Битрикс24", почта/email/mail → "Корпоративная почта", телефон/звонки/АТС → "Телефония", отчёты/дашборд/аналитика → "Аналитика"
- Выбирай ТОЛЬКО из предложенных ID"""

    resp = requests.post(
        'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {token}',
        },
        json={
            'model': 'GigaChat',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.1,
            'max_tokens': 150,
        },
        verify=False,
        timeout=20,
    )
    resp.raise_for_status()

    content = resp.json()['choices'][0]['message']['content'].strip()
    if content.startswith('```'):
        parts = content.split('\n', 1)
        if len(parts) > 1:
            content = parts[1]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()

    result = json.loads(content)

    valid_ts_ids = [ts['id'] for ts in ticket_services]
    valid_svc_ids = [s['id'] for s in services]

    if result.get('ticket_service_id') not in valid_ts_ids:
        result['ticket_service_id'] = valid_ts_ids[0] if valid_ts_ids else None
        result['confidence'] = 0

    raw_svc_ids = result.get('service_ids', [])
    if not isinstance(raw_svc_ids, list):
        raw_svc_ids = []
    result['service_ids'] = [sid for sid in raw_svc_ids if sid in valid_svc_ids]
    if not result['service_ids'] and valid_svc_ids:
        result['service_ids'] = [valid_svc_ids[0]]
        result['confidence'] = min(result.get('confidence', 0), 30)

    ts_info = services_map.get(result['ticket_service_id'], {})
    result['ticket_service_name'] = ts_info.get('name', '')
    result['service_names'] = []
    for sid in result['service_ids']:
        svc = next((s for s in services if s['id'] == sid), None)
        if svc:
            result['service_names'].append(svc['name'])

    return result


def handler(event, context):
    """Классификация заявки по описанию через GigaChat Lite"""
    if event.get('httpMethod') == 'OPTIONS':
        return response(200, {})

    if event.get('httpMethod') != 'POST':
        return response(405, {'error': 'Method not allowed'})

    if not GIGACHAT_AUTH_KEY:
        return response(500, {'error': 'GIGACHAT_AUTH_KEY not configured'})

    body = json.loads(event.get('body', '{}'))
    description = body.get('description', '').strip()

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

    cur.close()
    conn.close()

    try:
        result = classify_with_gigachat(description, ticket_services, services, mappings)
        return response(200, result)
    except json.JSONDecodeError:
        return response(500, {'error': 'Не удалось распознать ответ ИИ'})
    except requests.exceptions.Timeout:
        return response(504, {'error': 'Таймаут ответа от ИИ'})
    except requests.exceptions.RequestException as e:
        return response(502, {'error': f'Ошибка связи с ИИ: {str(e)}'})
    except (KeyError, IndexError):
        return response(500, {'error': 'Неожиданный формат ответа от ИИ'})
