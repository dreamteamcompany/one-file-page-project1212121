ALTER TABLE t_p67567221_one_file_page_projec.ticket_comments
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS external_source VARCHAR(50) NULL;