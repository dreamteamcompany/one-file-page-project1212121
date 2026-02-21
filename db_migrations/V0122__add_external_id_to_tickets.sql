ALTER TABLE t_p67567221_one_file_page_projec.tickets 
ADD COLUMN IF NOT EXISTS external_id varchar(100) NULL,
ADD COLUMN IF NOT EXISTS external_source varchar(50) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_external_id_source_idx 
ON t_p67567221_one_file_page_projec.tickets (external_id, external_source) 
WHERE external_id IS NOT NULL;