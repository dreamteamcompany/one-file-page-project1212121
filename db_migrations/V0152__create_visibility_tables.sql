CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.ticket_service_visible_users (
    id SERIAL PRIMARY KEY,
    ticket_service_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ticket_service_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.service_visible_users (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(service_id, user_id)
);