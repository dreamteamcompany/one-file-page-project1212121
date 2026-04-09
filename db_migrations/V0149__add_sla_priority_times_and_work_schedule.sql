
ALTER TABLE sla ADD COLUMN IF NOT EXISTS use_work_schedule BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS sla_priority_times (
    id SERIAL PRIMARY KEY,
    sla_id INTEGER NOT NULL REFERENCES sla(id) ON UPDATE CASCADE,
    priority_id INTEGER NOT NULL REFERENCES ticket_priorities(id) ON UPDATE CASCADE,
    response_time_minutes INTEGER NOT NULL CHECK (response_time_minutes > 0),
    response_notification_minutes INTEGER NOT NULL CHECK (response_notification_minutes > 0),
    resolution_time_minutes INTEGER NOT NULL CHECK (resolution_time_minutes > 0),
    resolution_notification_minutes INTEGER NOT NULL CHECK (resolution_notification_minutes > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sla_id, priority_id),
    CHECK (response_notification_minutes < response_time_minutes),
    CHECK (resolution_notification_minutes < resolution_time_minutes)
);

ALTER TABLE sla_group_budgets ADD COLUMN IF NOT EXISTS priority_id INTEGER REFERENCES ticket_priorities(id) ON UPDATE CASCADE;
