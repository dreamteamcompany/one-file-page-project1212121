UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET old_value = u.full_name
FROM t_p67567221_one_file_page_projec.users u
WHERE th.field_name = 'assigned_to'
  AND th.old_value ~ '^[0-9]+$'
  AND u.id = th.old_value::integer;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET new_value = u.full_name
FROM t_p67567221_one_file_page_projec.users u
WHERE th.field_name = 'assigned_to'
  AND th.new_value ~ '^[0-9]+$'
  AND u.id = th.new_value::integer;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET old_value = eg.name
FROM t_p67567221_one_file_page_projec.executor_groups eg
WHERE th.field_name = 'executor_group_id'
  AND th.old_value ~ '^[0-9]+$'
  AND eg.id = th.old_value::integer;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET new_value = eg.name
FROM t_p67567221_one_file_page_projec.executor_groups eg
WHERE th.field_name = 'executor_group_id'
  AND th.new_value ~ '^[0-9]+$'
  AND eg.id = th.new_value::integer;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET old_value = ts.name
FROM t_p67567221_one_file_page_projec.ticket_statuses ts
WHERE th.field_name = 'status_id'
  AND th.old_value ~ '^[0-9]+$'
  AND ts.id = th.old_value::integer;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET new_value = ts.name
FROM t_p67567221_one_file_page_projec.ticket_statuses ts
WHERE th.field_name = 'status_id'
  AND th.new_value ~ '^[0-9]+$'
  AND ts.id = th.new_value::integer;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET old_value = tp.name
FROM t_p67567221_one_file_page_projec.ticket_priorities tp
WHERE th.field_name = 'priority_id'
  AND th.old_value ~ '^[0-9]+$'
  AND tp.id = th.old_value::integer;

UPDATE t_p67567221_one_file_page_projec.ticket_history th
SET new_value = tp.name
FROM t_p67567221_one_file_page_projec.ticket_priorities tp
WHERE th.field_name = 'priority_id'
  AND th.new_value ~ '^[0-9]+$'
  AND tp.id = th.new_value::integer;