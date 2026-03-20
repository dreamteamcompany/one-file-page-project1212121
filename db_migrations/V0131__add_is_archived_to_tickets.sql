ALTER TABLE t_p67567221_one_file_page_projec.tickets
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_is_archived
ON t_p67567221_one_file_page_projec.tickets (is_archived);

UPDATE t_p67567221_one_file_page_projec.tickets t
SET is_archived = true
FROM t_p67567221_one_file_page_projec.ticket_statuses s
WHERE t.status_id = s.id AND s.is_open = false;