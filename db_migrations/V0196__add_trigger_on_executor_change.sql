ALTER TABLE ticket_watcher_rules
ADD COLUMN IF NOT EXISTS trigger_on_executor_change BOOLEAN NOT NULL DEFAULT false;
