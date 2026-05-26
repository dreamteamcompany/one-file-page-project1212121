-- Backfill наблюдателей по правилу #2 "ЮВ: наблюдатель" (executor_group_id=5 → user_id=13)
-- Применяем правило к уже существующим заявкам, которые подходят под условие.
INSERT INTO t_p67567221_one_file_page_projec.ticket_watchers (ticket_id, user_id)
SELECT t.id, 13
FROM t_p67567221_one_file_page_projec.tickets t
WHERE t.executor_group_id = 5
  AND t.created_by <> 13
  AND NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.ticket_watchers w
    WHERE w.ticket_id = t.id AND w.user_id = 13
  )
ON CONFLICT (ticket_id, user_id) DO NOTHING;