-- Создаем таблицу для связи заявок с услугами заявок
CREATE TABLE IF NOT EXISTS ticket_to_service_mappings (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    ticket_service_id INTEGER NOT NULL REFERENCES ticket_services(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, ticket_service_id)
);