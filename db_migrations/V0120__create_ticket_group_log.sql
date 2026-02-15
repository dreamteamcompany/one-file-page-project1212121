
CREATE TABLE ticket_group_log (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    executor_group_id INTEGER NOT NULL REFERENCES executor_groups(id),
    assigned_by INTEGER NULL REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP NULL,
    time_spent_minutes INTEGER NULL,
    budget_minutes INTEGER NULL,
    overdue_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_group_log_ticket ON ticket_group_log(ticket_id);
CREATE INDEX idx_ticket_group_log_group ON ticket_group_log(executor_group_id);
CREATE INDEX idx_ticket_group_log_active ON ticket_group_log(ticket_id) WHERE released_at IS NULL;
