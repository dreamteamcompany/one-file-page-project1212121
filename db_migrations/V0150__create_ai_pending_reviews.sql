CREATE TABLE IF NOT EXISTS ai_pending_reviews (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    ticket_service_id INTEGER,
    service_ids INTEGER[],
    ticket_service_name TEXT,
    service_names TEXT[],
    confidence INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'corrected', 'rejected')),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);