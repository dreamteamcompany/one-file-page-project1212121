-- Таблица групп полей
CREATE TABLE IF NOT EXISTS ticket_custom_field_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь групп полей с полями (many-to-many)
CREATE TABLE IF NOT EXISTS ticket_custom_field_group_fields (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES ticket_custom_field_groups(id),
    field_id INTEGER NOT NULL REFERENCES ticket_custom_fields(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, field_id)
);

-- Связь услуга-сервис-группы полей
CREATE TABLE IF NOT EXISTS ticket_service_field_mappings (
    id SERIAL PRIMARY KEY,
    ticket_service_id INTEGER NOT NULL REFERENCES ticket_services(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    field_group_id INTEGER NOT NULL REFERENCES ticket_custom_field_groups(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_service_id, service_id, field_group_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_field_group_fields_group ON ticket_custom_field_group_fields(group_id);
CREATE INDEX IF NOT EXISTS idx_field_group_fields_field ON ticket_custom_field_group_fields(field_id);
CREATE INDEX IF NOT EXISTS idx_service_mappings_ticket_service ON ticket_service_field_mappings(ticket_service_id);
CREATE INDEX IF NOT EXISTS idx_service_mappings_service ON ticket_service_field_mappings(service_id);