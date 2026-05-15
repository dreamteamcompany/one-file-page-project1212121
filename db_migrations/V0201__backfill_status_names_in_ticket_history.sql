-- Конвертируем числовые ID статусов в названия в исторических записях
UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET old_value = s.name
FROM t_p67567221_one_file_page_projec.ticket_statuses s
WHERE th.field_name = 'status_id'
  AND th.old_value ~ '^[0-9]+$'
  AND s.id = th.old_value::int;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET new_value = s.name
FROM t_p67567221_one_file_page_projec.ticket_statuses s
WHERE th.field_name = 'status_id'
  AND th.new_value ~ '^[0-9]+$'
  AND s.id = th.new_value::int;