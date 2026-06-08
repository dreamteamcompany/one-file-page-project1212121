ALTER TABLE t_p67567221_one_file_page_projec.ticket_comments
    ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER,
    ADD COLUMN IF NOT EXISTS mentioned_user_ids INTEGER[];

CREATE INDEX IF NOT EXISTS idx_ticket_comments_parent
    ON t_p67567221_one_file_page_projec.ticket_comments (parent_comment_id);