"""Обработчик CRUD для бюджетов групп в SLA"""
import json
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from shared_utils import response, verify_token, SCHEMA


class GroupBudgetItem(BaseModel):
    executor_group_id: int = Field(..., gt=0)
    resolution_minutes: int | None = Field(default=None, gt=0)
    response_minutes: int | None = Field(default=None, gt=0)
    sort_order: int = Field(default=0, ge=0)


class GroupBudgetsBatchRequest(BaseModel):
    sla_id: int = Field(..., gt=0)
    budgets: List[GroupBudgetItem] = Field(default=[])


def handle_sla_group_budgets(method: str, event: Dict[str, Any], conn) -> Dict[str, Any]:
    """CRUD бюджетов групп для SLA"""
    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})

    cur = conn.cursor()

    if method == 'GET':
        return _get_budgets(event, cur)
    elif method == 'PUT':
        return _save_budgets(event, cur, conn)

    return response(405, {'error': 'Метод не поддерживается'})


def _get_budgets(event: Dict[str, Any], cur) -> Dict[str, Any]:
    params = event.get('queryStringParameters') or {}
    sla_id = params.get('sla_id')

    query = f"""
        SELECT 
            gb.id, gb.sla_id, gb.executor_group_id,
            gb.resolution_minutes, gb.response_minutes,
            gb.sort_order, gb.created_at, gb.updated_at,
            eg.name AS group_name
        FROM {SCHEMA}.sla_group_budgets gb
        JOIN {SCHEMA}.executor_groups eg ON gb.executor_group_id = eg.id
    """
    query_params = []

    if sla_id:
        query += " WHERE gb.sla_id = %s"
        query_params.append(int(sla_id))

    query += " ORDER BY gb.sort_order, eg.name"

    cur.execute(query, query_params)
    return response(200, [dict(row) for row in cur.fetchall()])


def _save_budgets(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))

    try:
        req = GroupBudgetsBatchRequest(**body)
    except Exception as e:
        return response(400, {'error': f'Некорректные данные: {str(e)}'})

    cur.execute(
        f"SELECT id FROM {SCHEMA}.sla WHERE id = %s",
        (req.sla_id,)
    )
    if not cur.fetchone():
        return response(404, {'error': 'SLA не найден'})

    cur.execute(
        f"DELETE FROM {SCHEMA}.sla_group_budgets WHERE sla_id = %s",
        (req.sla_id,)
    )

    created_ids = []
    for budget in req.budgets:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.sla_group_budgets
                (sla_id, executor_group_id, resolution_minutes, response_minutes, sort_order)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            req.sla_id,
            budget.executor_group_id,
            budget.resolution_minutes,
            budget.response_minutes,
            budget.sort_order
        ))
        created_ids.append(cur.fetchone()['id'])

    conn.commit()
    return response(200, {
        'message': 'Бюджеты групп сохранены',
        'count': len(created_ids),
        'ids': created_ids
    })


def get_group_budget(cur, sla_id: int, executor_group_id: int) -> Dict[str, Any] | None:
    """Получить бюджет конкретной группы для SLA"""
    cur.execute(f"""
        SELECT resolution_minutes, response_minutes
        FROM {SCHEMA}.sla_group_budgets
        WHERE sla_id = %s AND executor_group_id = %s
    """, (sla_id, executor_group_id))
    row = cur.fetchone()
    return dict(row) if row else None
