CREATE TABLE IF NOT EXISTS bitrix_block_exceptions (
    id SERIAL PRIMARY KEY,
    bitrix_user_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    position VARCHAR(255),
    reason TEXT,
    added_by_user_id INTEGER,
    added_by_name VARCHAR(255),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitrix_block_exceptions_user_id ON bitrix_block_exceptions(bitrix_user_id);