-- Добавляем колонку bitrix_id для хранения ID подразделений из Bitrix24
ALTER TABLE departments ADD COLUMN IF NOT EXISTS bitrix_id VARCHAR(50);

-- Создаем индекс для быстрого поиска по bitrix_id
CREATE INDEX IF NOT EXISTS idx_departments_bitrix_id ON departments(bitrix_id);

-- Добавляем уникальное ограничение на комбинацию bitrix_id и company_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_bitrix_company 
ON departments(bitrix_id, company_id) 
WHERE bitrix_id IS NOT NULL;
