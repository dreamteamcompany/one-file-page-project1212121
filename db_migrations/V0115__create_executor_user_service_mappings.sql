
CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.executor_user_service_mappings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p67567221_one_file_page_projec.users(id),
    ticket_service_id INTEGER NOT NULL REFERENCES t_p67567221_one_file_page_projec.ticket_services(id),
    service_id INTEGER NOT NULL REFERENCES t_p67567221_one_file_page_projec.services(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ticket_service_id, service_id)
);
