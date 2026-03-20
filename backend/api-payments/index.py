"""API для работы с платежами — ЗАМОРОЖЕНА"""

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id, Authorization',
}

def handler(event, context):
    """Функция заморожена — сразу возвращает ответ без обращения к БД"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    return {
        'statusCode': 503,
        'headers': CORS_HEADERS,
        'body': '{"error": "Модуль платежей временно отключён"}'
    }