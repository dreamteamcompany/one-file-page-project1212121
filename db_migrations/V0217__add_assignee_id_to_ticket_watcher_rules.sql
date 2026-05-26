ALTER TABLE t_p67567221_one_file_page_projec.ticket_watcher_rules
  ADD COLUMN IF NOT EXISTS assignee_id INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_twr_assignee_id ON t_p67567221_one_file_page_projec.ticket_watcher_rules(assignee_id);

COMMENT ON COLUMN t_p67567221_one_file_page_projec.ticket_watcher_rules.assignee_id IS 'Условие: исполнитель заявки (tickets.assigned_to). NULL = любой.';