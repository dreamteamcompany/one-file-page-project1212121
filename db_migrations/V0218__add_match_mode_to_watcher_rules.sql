ALTER TABLE t_p67567221_one_file_page_projec.ticket_watcher_rules
  ADD COLUMN IF NOT EXISTS match_mode VARCHAR(8) NOT NULL DEFAULT 'AND';

COMMENT ON COLUMN t_p67567221_one_file_page_projec.ticket_watcher_rules.match_mode IS 'Режим объединения условий: AND (все должны совпасть) или OR (хотя бы одно).';