-- Таблица для хранения согласующих заявок
CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.ticket_approvals (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_approvals_ticket_id ON t_p67567221_one_file_page_projec.ticket_approvals(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_approvals_approver_id ON t_p67567221_one_file_page_projec.ticket_approvals(approver_id);