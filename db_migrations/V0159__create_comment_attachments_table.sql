CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.comment_attachments (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES t_p67567221_one_file_page_projec.ticket_comments(id),
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id
    ON t_p67567221_one_file_page_projec.comment_attachments(comment_id);
