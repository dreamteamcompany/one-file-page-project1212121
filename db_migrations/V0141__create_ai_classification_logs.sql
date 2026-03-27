CREATE TABLE t_p67567221_one_file_page_projec.ai_classification_logs (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    ticket_service_id INTEGER,
    ticket_service_name VARCHAR(255),
    service_ids INTEGER[],
    service_names TEXT[],
    confidence INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    raw_response TEXT,
    examples_used INTEGER DEFAULT 0,
    rules_used INTEGER DEFAULT 0,
    duration_ms INTEGER,
    test_mode BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);