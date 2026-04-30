CREATE TABLE IF NOT EXISTS bitrix_block_reports (
    id SERIAL PRIMARY KEY,
    started_by_user_id INTEGER,
    started_by_name VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mode VARCHAR(50) NOT NULL,
    days_threshold INTEGER,
    total_requested INTEGER NOT NULL DEFAULT 0,
    deactivated_count INTEGER NOT NULL DEFAULT 0,
    errors_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bitrix_block_report_items (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    bitrix_user_id VARCHAR(50),
    full_name VARCHAR(255),
    email VARCHAR(255),
    position VARCHAR(255),
    last_login TIMESTAMPTZ,
    days_inactive INTEGER,
    status VARCHAR(20) NOT NULL,
    error_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_bitrix_block_report_items_report_id ON bitrix_block_report_items(report_id);
CREATE INDEX IF NOT EXISTS idx_bitrix_block_reports_started_at ON bitrix_block_reports(started_at DESC);