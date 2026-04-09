"""Обработчик для управления SLA (Service Level Agreements)"""
import json
from typing import Dict, Any, List
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
    use_work_schedule: bool = Field(default=False)

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


class PriorityTimeItem(BaseModel):
    priority_id: int = Field(..., gt=0)
    response_time_minutes: int = Field(..., gt=0)
    response_notification_minutes: int = Field(..., gt=0)
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


class PriorityTimesBatchRequest(BaseModel):
    sla_id: int = Field(..., gt=0)
    priority_times: List[PriorityTimeItem] = Field(default=[])


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


def handle_sla_priority_times(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """CRUD для приоритетных времён SLA"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    cur = conn.cursor()

    if method == 'GET':
        return _get_priority_times(event, cur)
    elif method == 'PUT':
        return _save_priority_times(event, cur, conn)

    return response(405, {'error': 'Метод не поддерживается'})


def _list_sla(cur) -> Dict[str, Any]:
    cur.execute(f"""
        SELECT 
            id, name, response_time_minutes, response_notification_minutes,
            no_response_minutes, no_response_status_id,
            resolution_time_minutes, resolution_notification_minutes,
            use_work_schedule,
            created_at, updated_at
        FROM {SCHEMA}.sla
        ORDER BY name
    """)
    slas = [dict(row) for row in cur.fetchall()]

    for sla in slas:
        cur.execute(f"""
            SELECT pt.id, pt.priority_id, pt.response_time_minutes, 
                   pt.response_notification_minutes,
                   pt.resolution_time_minutes, pt.resolution_notification_minutes,
                   tp.name as priority_name, tp.level as priority_level, tp.color as priority_color
            FROM {SCHEMA}.sla_priority_times pt
            JOIN {SCHEMA}.ticket_priorities tp ON pt.priority_id = tp.id
            WHERE pt.sla_id = %s
            ORDER BY tp.level
        """, (sla['id'],))
        sla['priority_times'] = [dict(row) for row in cur.fetchall()]

    return response(200, slas)


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
             resolution_time_minutes, resolution_notification_minutes,
             use_work_schedule)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        sla_req.name,
        sla_req.response_time_minutes,
        sla_req.response_notification_minutes,
        sla_req.no_response_minutes,
        sla_req.no_response_status_id,
        sla_req.resolution_time_minutes,
        sla_req.resolution_notification_minutes,
        sla_req.use_work_schedule
    ))
    sla_id = cur.fetchone()['id']

    priority_times = body.get('priority_times', [])
    if priority_times:
        _save_priority_times_for_sla(cur, sla_id, priority_times)

    conn.commit()
    return response(201, {'id': sla_id, 'message': 'SLA создан'})


def _update_sla(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    try:
        body = json.loads(event.get('body', '{}'))
        sla_id = body.get('id')
        if not sla_id:
            return response(400, {'error': 'Не указан ID SLA'})

        sla_req = SLARequest(**{k: v for k, v in body.items() if k not in ('id', 'priority_times')})
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
            use_work_schedule = %s,
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
        sla_req.use_work_schedule,
        sla_id
    ))

    if cur.rowcount == 0:
        conn.rollback()
        return response(404, {'error': 'SLA не найден'})

    priority_times = body.get('priority_times')
    if priority_times is not None:
        cur.execute(f"DELETE FROM {SCHEMA}.sla_priority_times WHERE sla_id = %s", (sla_id,))
        if priority_times:
            _save_priority_times_for_sla(cur, sla_id, priority_times)

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


def _save_priority_times_for_sla(cur, sla_id: int, priority_times: list):
    for pt_data in priority_times:
        try:
            pt = PriorityTimeItem(**pt_data)
        except Exception:
            continue
        cur.execute(f"""
            INSERT INTO {SCHEMA}.sla_priority_times
                (sla_id, priority_id, response_time_minutes, response_notification_minutes,
                 resolution_time_minutes, resolution_notification_minutes)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (sla_id, priority_id) DO UPDATE SET
                response_time_minutes = EXCLUDED.response_time_minutes,
                response_notification_minutes = EXCLUDED.response_notification_minutes,
                resolution_time_minutes = EXCLUDED.resolution_time_minutes,
                resolution_notification_minutes = EXCLUDED.resolution_notification_minutes,
                updated_at = CURRENT_TIMESTAMP
        """, (
            sla_id, pt.priority_id,
            pt.response_time_minutes, pt.response_notification_minutes,
            pt.resolution_time_minutes, pt.resolution_notification_minutes
        ))


def _get_priority_times(event: Dict[str, Any], cur) -> Dict[str, Any]:
    params = event.get('queryStringParameters') or {}
    sla_id = params.get('sla_id')

    if not sla_id:
        return response(400, {'error': 'Не указан sla_id'})

    cur.execute(f"""
        SELECT pt.id, pt.sla_id, pt.priority_id,
               pt.response_time_minutes, pt.response_notification_minutes,
               pt.resolution_time_minutes, pt.resolution_notification_minutes,
               tp.name as priority_name, tp.level as priority_level, tp.color as priority_color
        FROM {SCHEMA}.sla_priority_times pt
        JOIN {SCHEMA}.ticket_priorities tp ON pt.priority_id = tp.id
        WHERE pt.sla_id = %s
        ORDER BY tp.level
    """, (int(sla_id),))

    return response(200, [dict(row) for row in cur.fetchall()])


def _save_priority_times(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    try:
        body = json.loads(event.get('body', '{}'))
        req = PriorityTimesBatchRequest(**body)
    except Exception as e:
        return response(400, {'error': f'Некорректные данные: {str(e)}'})

    cur.execute(f"SELECT id FROM {SCHEMA}.sla WHERE id = %s", (req.sla_id,))
    if not cur.fetchone():
        return response(404, {'error': 'SLA не найден'})

    cur.execute(f"DELETE FROM {SCHEMA}.sla_priority_times WHERE sla_id = %s", (req.sla_id,))
    _save_priority_times_for_sla(cur, req.sla_id, [pt.model_dump() for pt in req.priority_times])

    conn.commit()
    return response(200, {'message': 'Приоритетные времена сохранены', 'count': len(req.priority_times)})
