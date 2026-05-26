ALTER TABLE users ADD COLUMN IF NOT EXISTS max_user_id VARCHAR(50) NULL;
CREATE INDEX IF NOT EXISTS idx_users_max_user_id ON users(max_user_id) WHERE max_user_id IS NOT NULL;
COMMENT ON COLUMN users.max_user_id IS 'User ID в мессенджере MAX (botapi.max.ru) для отправки уведомлений ботом';
