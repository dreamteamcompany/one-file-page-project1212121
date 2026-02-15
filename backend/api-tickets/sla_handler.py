"""Обработчик для управления SLA (Service Level Agreements)"""
import json
from typing import Dict, Any
from pydantic import BaseModel, Field, field_validator
from shared_utils import response, verify_token, SCHEMA


class SLARequest(BaseModel):
    name: str = Field(..., min_length=1)
    response_time_minutes: int = Field(..., gt=0)
    response_notification_minutes: int = Field(..., gt=0)
    no_response_minutes: int | None = Field(default=None, gt=0)
    no_response_status_id: int | None = None
    resolution_time_minutes: int = Field(..., gt=0)
    resolution_notification_minutes: int = Field(..., gt=0)

    @field_validator('response_notification_minutes')
    def validate_response_notification(cls, v, info):
        if 'response_time_minutes' in info.data and v >= info.data['response_time_minutes']:
            raise ValueError('Уведомление должно быть раньше срока реакции')
        return v

    @field_validator('resolution_notification_minutes')
    def validate_resolution_notification(cls, v, info):
        if 'resolution_time_minutes' in info.data and v >= info.data['resolution_time_minutes']:
            raise ValueError('Уведомление должно быть раньше срока решения')
        return v


def handle_sla(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Управление SLA"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    cur = conn.cursor()

    if method == 'GET':
        return _list_sla(cur)
    elif method == 'POST':
        return _create_sla(event, cur, conn)
    elif method == 'PUT':
        return _update_sla(event, cur, conn)
    elif method == 'DELETE':
        return _delete_sla(event, cur, conn)

    return response(405, {'error': 'Метод не поддерживается'})


def _list_sla(cur) -> Dict[str, Any]:
    cur.execute(f"""
        SELECT 
            id, name, response_time_minutes, response_notification_minutes,
            no_response_minutes, no_response_status_id,
            resolution_time_minutes, resolution_notification_minutes,
            created_at, updated_at
        FROM {SCHEMA}.sla
        ORDER BY name
    """)
    return response(200, [dict(row) for row in cur.fetchall()])


def _create_sla(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    try:
        body = json.loads(event.get('body', '{}'))
        sla_req = SLARequest(**body)
    except Exception as e:
        return response(400, {'error': f'Некорректные данные: {str(e)}'})

    cur.execute(f"""
        INSERT INTO {SCHEMA}.sla 
            (name, response_time_minutes, response_notification_minutes,
             no_response_minutes, no_response_status_id,
             resolution_time_minutes, resolution_notification_minutes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        sla_req.name,
        sla_req.response_time_minutes,
        sla_req.response_notification_minutes,
        sla_req.no_response_minutes,
        sla_req.no_response_status_id,
        sla_req.resolution_time_minutes,
        sla_req.resolution_notification_minutes
    ))
    sla_id = cur.fetchone()['id']
    conn.commit()
    return response(201, {'id': sla_id, 'message': 'SLA создан'})


def _update_sla(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    try:
        body = json.loads(event.get('body', '{}'))
        sla_id = body.get('id')
        if not sla_id:
            return response(400, {'error': 'Не указан ID SLA'})

        sla_req = SLARequest(**{k: v for k, v in body.items() if k != 'id'})
    except Exception as e:
        return response(400, {'error': f'Некорректные данные: {str(e)}'})

    cur.execute(f"""
        UPDATE {SCHEMA}.sla SET
            name = %s,
            response_time_minutes = %s,
            response_notification_minutes = %s,
            no_response_minutes = %s,
            no_response_status_id = %s,
            resolution_time_minutes = %s,
            resolution_notification_minutes = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    """, (
        sla_req.name,
        sla_req.response_time_minutes,
        sla_req.response_notification_minutes,
        sla_req.no_response_minutes,
        sla_req.no_response_status_id,
        sla_req.resolution_time_minutes,
        sla_req.resolution_notification_minutes,
        sla_id
    ))

    if cur.rowcount == 0:
        conn.rollback()
        return response(404, {'error': 'SLA не найден'})

    conn.commit()
    return response(200, {'message': 'SLA обновлён'})


def _delete_sla(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    try:
        body = json.loads(event.get('body', '{}'))
        sla_id = body.get('id')
        if not sla_id:
            return response(400, {'error': 'Не указан ID SLA'})
    except Exception as e:
        return response(400, {'error': f'Некорректные данные: {str(e)}'})

    cur.execute(f"DELETE FROM {SCHEMA}.sla WHERE id = %s", (sla_id,))

    if cur.rowcount == 0:
        conn.rollback()
        return response(404, {'error': 'SLA не найден'})

    conn.commit()
    return response(200, {'message': 'SLA удалён'})
