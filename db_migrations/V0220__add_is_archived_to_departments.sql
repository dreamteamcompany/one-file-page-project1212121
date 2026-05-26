-- Добавляем поле is_archived в departments для безопасной "мягкой" архивации
-- отделов, удалённых в Bitrix24. Никогда не удаляем физически.

ALTER TABLE departments
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Индекс для быстрой фильтрации архивных
CREATE INDEX IF NOT EXISTS idx_departments_is_archived ON departments(is_archived);

-- Колонка archived_at для аудита
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL;

COMMENT ON COLUMN departments.is_archived IS 'Отдел удалён в источнике (Bitrix), у нас оставлен для сохранения связей с заявками и юзерами';
COMMENT ON COLUMN departments.archived_at IS 'Когда отдел был помечен как архивный';
