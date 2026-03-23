ALTER TABLE users ADD COLUMN bitrix_user_id VARCHAR(50) NULL;
CREATE INDEX idx_users_bitrix_user_id ON users(bitrix_user_id) WHERE bitrix_user_id IS NOT NULL;