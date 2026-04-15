CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p67567221_one_file_page_projec.system_settings (key, value, description)
VALUES ('classification_mode', 'ai', 'Режим классификации заявок: ai или manual')
ON CONFLICT (key) DO NOTHING;