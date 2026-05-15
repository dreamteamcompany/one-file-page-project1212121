-- Синхронизируем is_archived с is_closed статуса для всех заявок,
-- которые "застряли" в основном списке, хотя статус финальный (Решена/Закрыта).
UPDATE t_p67567221_one_file_page_projec.tickets t
SET is_archived = true
FROM t_p67567221_one_file_page_projec.ticket_statuses s
WHERE s.id = t.status_id
  AND COALESCE(s.is_closed, false) = true
  AND COALESCE(t.is_archived, false) = false;

-- И обратно: если статус снова не финальный, а is_archived=true — снимаем флаг.
UPDATE t_p67567221_one_file_page_projec.tickets t
SET is_archived = false
FROM t_p67567221_one_file_page_projec.ticket_statuses s
WHERE s.id = t.status_id
  AND COALESCE(s.is_closed, false) = false
  AND COALESCE(t.is_archived, false) = true;