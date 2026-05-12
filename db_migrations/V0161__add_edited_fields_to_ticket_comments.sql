ALTER TABLE ticket_comments
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_ticket_comments_edited_at ON ticket_comments(edited_at);
