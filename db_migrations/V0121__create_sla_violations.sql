
CREATE TABLE sla_violations (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    violation_type VARCHAR(50) NOT NULL,
    executor_group_id INTEGER NULL REFERENCES executor_groups(id),
    budget_minutes INTEGER NULL,
    actual_minutes INTEGER NULL,
    overdue_minutes INTEGER NOT NULL DEFAULT 0,
    violated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sla_id INTEGER NULL REFERENCES sla(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sla_violations_ticket ON sla_violations(ticket_id);
CREATE INDEX idx_sla_violations_type ON sla_violations(violation_type);
CREATE INDEX idx_sla_violations_group ON sla_violations(executor_group_id);
CREATE INDEX idx_sla_violations_date ON sla_violations(violated_at);
