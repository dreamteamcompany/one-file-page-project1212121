
CREATE TABLE sla_group_budgets (
    id SERIAL PRIMARY KEY,
    sla_id INTEGER NOT NULL REFERENCES sla(id),
    executor_group_id INTEGER NOT NULL REFERENCES executor_groups(id),
    resolution_minutes INTEGER NULL,
    response_minutes INTEGER NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sla_id, executor_group_id)
);

CREATE INDEX idx_sla_group_budgets_sla ON sla_group_budgets(sla_id);
