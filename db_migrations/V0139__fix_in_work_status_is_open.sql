UPDATE t_p67567221_one_file_page_projec.ticket_statuses SET is_open = true WHERE id = 7;

UPDATE t_p67567221_one_file_page_projec.tickets
SET is_archived = false, updated_at = NOW()
WHERE status_id IN (SELECT id FROM t_p67567221_one_file_page_projec.ticket_statuses WHERE is_open = true)
AND is_archived = true;