-- Добавление поля is_approval_revoked в таблицу ticket_statuses
ALTER TABLE ticket_statuses 
ADD COLUMN IF NOT EXISTS is_approval_revoked BOOLEAN DEFAULT FALSE;

-- Обновление комментария к таблице
COMMENT ON COLUMN ticket_statuses.is_approval_revoked IS 'Статус "Согласование отозвано" - заявка была на согласовании, но согласование отозвано';
