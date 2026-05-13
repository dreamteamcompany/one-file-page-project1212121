UPDATE t_p67567221_one_file_page_projec.tickets t
SET is_archived = true
FROM t_p67567221_one_file_page_projec.ticket_statuses s
WHERE t.status_id = s.id AND s.is_closed = true AND t.is_archived = false;