CREATE TABLE t_p67567221_one_file_page_projec.sla_service_mappings (
    id SERIAL PRIMARY KEY,
    sla_id INTEGER NOT NULL REFERENCES t_p67567221_one_file_page_projec.sla(id),
    ticket_service_id INTEGER REFERENCES t_p67567221_one_file_page_projec.ticket_services(id),
    service_id INTEGER REFERENCES t_p67567221_one_file_page_projec.services(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sla_service_mapping UNIQUE (ticket_service_id, service_id)
);