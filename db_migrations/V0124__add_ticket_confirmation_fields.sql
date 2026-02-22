-- Добавляем поля для механизма подтверждения выполнения заявки
ALTER TABLE t_p67567221_one_file_page_projec.tickets
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS auto_close_notified BOOLEAN DEFAULT FALSE;

-- Добавляем флаг is_pending_confirmation в ticket_statuses
ALTER TABLE t_p67567221_one_file_page_projec.ticket_statuses
  ADD COLUMN IF NOT EXISTS is_pending_confirmation BOOLEAN DEFAULT FALSE;

-- Добавляем новый статус "Ожидает подтверждения"
INSERT INTO t_p67567221_one_file_page_projec.ticket_statuses (name, color, is_closed, is_open, is_approval, is_approval_revoked, is_approved, is_waiting_response, is_pending_confirmation)
VALUES ('Ожидает подтверждения', '#f97316', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE);