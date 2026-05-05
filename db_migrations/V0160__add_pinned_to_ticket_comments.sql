ALTER TABLE t_p67567221_one_file_page_projec.ticket_comments
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE t_p67567221_one_file_page_projec.ticket_comments
    ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;

ALTER TABLE t_p67567221_one_file_page_projec.ticket_comments
    ADD COLUMN IF NOT EXISTS pinned_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_ticket_comments_pinned
    ON t_p67567221_one_file_page_projec.ticket_comments(ticket_id, is_pinned)
    WHERE is_pinned = TRUE;
