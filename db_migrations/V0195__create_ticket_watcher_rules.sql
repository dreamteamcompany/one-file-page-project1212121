CREATE TABLE IF NOT EXISTS ticket_watcher_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    trigger_on_create BOOLEAN NOT NULL DEFAULT true,
    trigger_on_update BOOLEAN NOT NULL DEFAULT false,
    category_id INTEGER REFERENCES ticket_categories(id),
    department_id INTEGER REFERENCES departments(id),
    priority_id INTEGER REFERENCES ticket_priorities(id),
    executor_group_id INTEGER REFERENCES executor_groups(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watcher_rules_active ON ticket_watcher_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_watcher_rules_category ON ticket_watcher_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_watcher_rules_department ON ticket_watcher_rules(department_id);
CREATE INDEX IF NOT EXISTS idx_watcher_rules_priority ON ticket_watcher_rules(priority_id);
CREATE INDEX IF NOT EXISTS idx_watcher_rules_group ON ticket_watcher_rules(executor_group_id);

CREATE TABLE IF NOT EXISTS ticket_watcher_rule_targets (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES ticket_watcher_rules(id),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('user','group','role')),
    target_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(rule_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_watcher_rule_targets_rule ON ticket_watcher_rule_targets(rule_id);
CREATE INDEX IF NOT EXISTS idx_watcher_rule_targets_type ON ticket_watcher_rule_targets(target_type, target_id);
