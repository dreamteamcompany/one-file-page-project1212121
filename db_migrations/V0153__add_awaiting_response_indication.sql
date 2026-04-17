-- Система индикации "кому сейчас мяч" в тикетах
-- Добавляем поля в tickets и ticket_comments

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS awaiting_response_from VARCHAR(16) DEFAULT 'none' CHECK (awaiting_response_from IN ('customer', 'executor', 'none')),
ADD COLUMN IF NOT EXISTS awaiting_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS awaiting_cleared_by VARCHAR(16);

COMMENT ON COLUMN tickets.awaiting_response_from IS 'Чей ход: customer (заказчик), executor (исполнитель), none (ответ не требуется)';
COMMENT ON COLUMN tickets.awaiting_since IS 'Когда была проставлена текущая индикация';
COMMENT ON COLUMN tickets.awaiting_cleared_by IS 'Как была снята индикация: manual (вручную), auto (при ответе), none';

CREATE INDEX IF NOT EXISTS idx_tickets_awaiting_response_from ON tickets(awaiting_response_from);

ALTER TABLE ticket_comments
ADD COLUMN IF NOT EXISTS requires_response BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN ticket_comments.requires_response IS 'Требует ли комментарий ответа (если false, индикация не проставляется)';
