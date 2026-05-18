-- Фоновая синхронизация vsDesk
CREATE TABLE IF NOT EXISTS vsdesk_sync_jobs (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    -- running / done / failed / cancelled
    queue JSONB NOT NULL DEFAULT '[]'::jsonb,
    total INTEGER NOT NULL DEFAULT 0,
    processed INTEGER NOT NULL DEFAULT 0,
    inserted INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0,
    filtered INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    error_details JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_error TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_tick_at TIMESTAMP,
    finished_at TIMESTAMP,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vsdesk_jobs_status ON vsdesk_sync_jobs(status);
