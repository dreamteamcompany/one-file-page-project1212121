-- Колонка для пометки записей истории, относящихся к скрытым (внутренним) комментариям
ALTER TABLE t_p67567221_one_file_page_projec.ticket_history
    ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

-- Бэкфилл: пометить записи истории о существующих скрытых комментариях.
-- Сопоставляем записи field_name='comment' с внутренними комментариями того же
-- тикета и автора, созданными в тот же момент (NOW() при вставке истории и комментария).
UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET is_internal = TRUE
FROM t_p67567221_one_file_page_projec.ticket_comments tc
WHERE th.field_name = 'comment'
  AND th.is_internal = FALSE
  AND tc.is_internal = TRUE
  AND tc.ticket_id = th.ticket_id
  AND tc.user_id = th.user_id
  AND ABS(EXTRACT(EPOCH FROM (tc.created_at - th.created_at))) < 5;