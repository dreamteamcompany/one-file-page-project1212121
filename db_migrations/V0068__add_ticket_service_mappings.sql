-- Создание связующей таблицы между ticket_services и services
CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.ticket_service_mappings (
    id SERIAL PRIMARY KEY,
    ticket_service_id INTEGER NOT NULL REFERENCES t_p67567221_one_file_page_projec.ticket_services(id),
    service_id INTEGER NOT NULL REFERENCES t_p67567221_one_file_page_projec.services(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_service_id, service_id)
);

CREATE INDEX idx_ticket_service_mappings_ticket_service ON t_p67567221_one_file_page_projec.ticket_service_mappings(ticket_service_id);
CREATE INDEX idx_ticket_service_mappings_service ON t_p67567221_one_file_page_projec.ticket_service_mappings(service_id);

COMMENT ON TABLE t_p67567221_one_file_page_projec.ticket_service_mappings IS 'Связь между услугами заявок (ticket_services) и сервисами услуг (services)';
