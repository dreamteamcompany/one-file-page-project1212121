
CREATE TABLE ai_training_examples (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    ticket_service_id INTEGER NOT NULL REFERENCES ticket_services(id),
    service_ids INTEGER[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_training_rules (
    id SERIAL PRIMARY KEY,
    rule_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_examples_ts ON ai_training_examples(ticket_service_id);
CREATE INDEX idx_ai_rules_active ON ai_training_rules(is_active);
