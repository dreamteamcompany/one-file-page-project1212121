-- Добавляем поле is_waiting_response для статусов "Ожидание ответа"
ALTER TABLE ticket_statuses 
ADD COLUMN is_waiting_response BOOLEAN DEFAULT FALSE;

-- Устанавливаем флаг для статуса "Ожидает ответа"
UPDATE ticket_statuses 
SET is_waiting_response = TRUE 
WHERE id = 14;