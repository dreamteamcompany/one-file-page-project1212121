-- Добавление поля is_approved в таблицу ticket_statuses
ALTER TABLE ticket_statuses 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Обновление комментария к таблице
COMMENT ON COLUMN ticket_statuses.is_approved IS 'Статус "Согласовано" - заявка согласована всеми согласующими';