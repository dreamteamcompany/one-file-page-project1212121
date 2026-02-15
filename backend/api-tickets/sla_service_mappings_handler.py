"""Обработчик CRUD для связей SLA с комбинациями услуга+сервис"""
import json
from typing import Dict, Any
from shared_utils import response, verify_token, SCHEMA


def handle_sla_service_mappings(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """CRUD связей SLA ↔ услуга+сервис"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    cur = conn.cursor()

    if method == 'GET':
        return _get_mappings(cur)
    elif method == 'POST':
        return _create_mapping(event, cur, conn)
    elif method == 'PUT':
        return _update_mapping(event, cur, conn)
    elif method == 'DELETE':
        return _delete_mapping(event, cur, conn)

    return response(405, {'error': 'Метод не поддерживается'})


def _get_mappings(cur) -> Dict[str, Any]:
    cur.execute(f"""
        SELECT 
            m.id, m.sla_id, m.ticket_service_id, m.service_id, m.created_at,
            s.name AS sla_name,
            s.response_time_minutes, s.resolution_time_minutes,
            s.response_notification_minutes, s.resolution_notification_minutes,
            ts.name AS ticket_service_name,
            srv.name AS service_name
        FROM {SCHEMA}.sla_service_mappings m
        JOIN {SCHEMA}.sla s ON m.sla_id = s.id
        LEFT JOIN {SCHEMA}.ticket_services ts ON m.ticket_service_id = ts.id
        LEFT JOIN {SCHEMA}.services srv ON m.service_id = srv.id
        ORDER BY ts.name, srv.name
    """)
    return response(200, [dict(row) for row in cur.fetchall()])


def _create_mapping(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    sla_id = body.get('sla_id')
    ticket_service_id = body.get('ticket_service_id')
    service_id = body.get('service_id')

    if not sla_id:
        return response(400, {'error': 'sla_id обязателен'})
    if not ticket_service_id and not service_id:
        return response(400, {'error': 'Укажите хотя бы услугу или сервис'})

    cur.execute(f"""
        SELECT id FROM {SCHEMA}.sla_service_mappings
        WHERE ticket_service_id IS NOT DISTINCT FROM %s
          AND service_id IS NOT DISTINCT FROM %s
    """, (ticket_service_id, service_id))
    if cur.fetchone():
        return response(409, {'error': 'Такая связь уже существует'})

    cur.execute(f"""
        INSERT INTO {SCHEMA}.sla_service_mappings (sla_id, ticket_service_id, service_id)
        VALUES (%s, %s, %s)
        RETURNING id
    """, (sla_id, ticket_service_id, service_id))
    mapping_id = cur.fetchone()['id']
    conn.commit()
    return response(201, {'id': mapping_id, 'message': 'Связь создана'})


def _update_mapping(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    mapping_id = body.get('id')
    sla_id = body.get('sla_id')

    if not mapping_id:
        return response(400, {'error': 'Не указан ID связи'})
    if not sla_id:
        return response(400, {'error': 'sla_id обязателен'})

    cur.execute(f"""
        UPDATE {SCHEMA}.sla_service_mappings
        SET sla_id = %s,
            ticket_service_id = %s,
            service_id = %s
        WHERE id = %s
    """, (sla_id, body.get('ticket_service_id'), body.get('service_id'), mapping_id))

    if cur.rowcount == 0:
        conn.rollback()
        return response(404, {'error': 'Связь не найдена'})

    conn.commit()
    return response(200, {'message': 'Связь обновлена'})


def _delete_mapping(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    mapping_id = body.get('id')

    if not mapping_id:
        return response(400, {'error': 'Не указан ID связи'})

    cur.execute(f"DELETE FROM {SCHEMA}.sla_service_mappings WHERE id = %s", (mapping_id,))
    if cur.rowcount == 0:
        conn.rollback()
        return response(404, {'error': 'Связь не найдена'})

    conn.commit()
    return response(200, {'message': 'Связь удалена'})


def resolve_sla_for_ticket(cur, ticket_service_id, service_ids) -> Dict[str, Any] | None:
    """Находит подходящий SLA для комбинации услуга+сервис.
    Приоритет: точное совпадение (услуга+сервис) > только услуга > только сервис."""
    if ticket_service_id and service_ids:
        placeholders = ','.join(['%s'] * len(service_ids))
        cur.execute(f"""
            SELECT s.* FROM {SCHEMA}.sla s
            JOIN {SCHEMA}.sla_service_mappings m ON s.id = m.sla_id
            WHERE m.ticket_service_id = %s AND m.service_id IN ({placeholders})
            LIMIT 1
        """, [ticket_service_id] + list(service_ids))
        row = cur.fetchone()
        if row:
            return dict(row)

    if ticket_service_id:
        cur.execute(f"""
            SELECT s.* FROM {SCHEMA}.sla s
            JOIN {SCHEMA}.sla_service_mappings m ON s.id = m.sla_id
            WHERE m.ticket_service_id = %s AND m.service_id IS NULL
            LIMIT 1
        """, (ticket_service_id,))
        row = cur.fetchone()
        if row:
            return dict(row)

    if service_ids:
        placeholders = ','.join(['%s'] * len(service_ids))
        cur.execute(f"""
            SELECT s.* FROM {SCHEMA}.sla s
            JOIN {SCHEMA}.sla_service_mappings m ON s.id = m.sla_id
            WHERE m.ticket_service_id IS NULL AND m.service_id IN ({placeholders})
            LIMIT 1
        """, list(service_ids))
        row = cur.fetchone()
        if row:
            return dict(row)

    return None
