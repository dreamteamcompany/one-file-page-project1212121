-- Добавляем колонку service_id для связи с таблицей services
ALTER TABLE ticket_to_service_mappings 
ADD COLUMN IF NOT EXISTS service_id INTEGER;

-- Добавляем внешний ключ
ALTER TABLE ticket_to_service_mappings
ADD CONSTRAINT fk_ticket_to_service_mappings_service
FOREIGN KEY (service_id) REFERENCES services(id);

-- Добавляем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_ticket_to_service_mappings_service_id 
ON ticket_to_service_mappings(service_id);

-- Комментарий
COMMENT ON COLUMN ticket_to_service_mappings.service_id IS 'ID сервиса из таблицы services (конкретный выбранный сервис)';
COMMENT ON COLUMN ticket_to_service_mappings.ticket_service_id IS 'ID услуги из таблицы ticket_services (категория услуги)';