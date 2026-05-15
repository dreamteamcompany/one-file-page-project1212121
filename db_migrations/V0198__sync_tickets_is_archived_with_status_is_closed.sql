-- Синхронизируем поле tickets.is_archived с флагом ticket_statuses.is_closed
-- Раньше is_archived обновлялся только в момент смены статуса (PUT /tickets),
-- из-за чего заявки в "закрытых" статусах могли оставаться активными,
-- если флаг is_closed у статуса включили задним числом.

UPDATE tickets t
SET is_archived = true
FROM ticket_statuses s
WHERE s.id = t.status_id
  AND COALESCE(s.is_closed, false) = true
  AND COALESCE(t.is_archived, false) = false;

UPDATE tickets t
SET is_archived = false
FROM ticket_statuses s
WHERE s.id = t.status_id
  AND COALESCE(s.is_closed, false) = false
  AND COALESCE(t.is_archived, false) = true;
