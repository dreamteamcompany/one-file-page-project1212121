CREATE TABLE IF NOT EXISTS ticket_status_roles (
    status_id INTEGER NOT NULL REFERENCES ticket_statuses(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (status_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_status_roles_role
    ON ticket_status_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status_roles_status
    ON ticket_status_roles(status_id);
