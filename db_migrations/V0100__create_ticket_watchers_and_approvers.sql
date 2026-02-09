-- Таблица наблюдателей заявок
CREATE TABLE IF NOT EXISTS ticket_watchers (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_watchers_ticket ON ticket_watchers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_user ON ticket_watchers(user_id);

-- Таблица согласующих заявок
CREATE TABLE IF NOT EXISTS ticket_approvers (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    approver_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    comment TEXT,
    approved_at TIMESTAMP,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ticket_id, approver_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_approvers_ticket ON ticket_approvers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_approvers_user ON ticket_approvers(approver_id);
