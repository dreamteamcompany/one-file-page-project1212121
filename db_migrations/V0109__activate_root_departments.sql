-- Активируем корневые подразделения которые были деактивированы
UPDATE departments 
SET is_active = true 
WHERE parent_id IS NULL AND is_active = false;