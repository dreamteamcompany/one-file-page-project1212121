UPDATE t_p67567221_one_file_page_projec.tickets
SET is_archived = false, updated_at = NOW()
WHERE is_archived = true
AND status_id IN (
    SELECT id FROM t_p67567221_one_file_page_projec.ticket_statuses WHERE is_closed = false
);