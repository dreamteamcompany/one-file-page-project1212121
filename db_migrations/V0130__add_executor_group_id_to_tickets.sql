ALTER TABLE t_p67567221_one_file_page_projec.tickets 
ADD COLUMN IF NOT EXISTS executor_group_id INTEGER REFERENCES t_p67567221_one_file_page_projec.executor_groups(id);

CREATE INDEX IF NOT EXISTS idx_tickets_executor_group ON t_p67567221_one_file_page_projec.tickets(executor_group_id);