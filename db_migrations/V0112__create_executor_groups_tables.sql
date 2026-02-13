
CREATE TABLE executor_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE executor_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES executor_groups(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    is_lead BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE TABLE executor_group_service_mappings (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES executor_groups(id),
    ticket_service_id INTEGER NOT NULL REFERENCES ticket_services(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, ticket_service_id, service_id)
);

CREATE INDEX idx_egm_group_id ON executor_group_members(group_id);
CREATE INDEX idx_egm_user_id ON executor_group_members(user_id);
CREATE INDEX idx_egsm_group_id ON executor_group_service_mappings(group_id);
CREATE INDEX idx_egsm_service_combo ON executor_group_service_mappings(ticket_service_id, service_id);
