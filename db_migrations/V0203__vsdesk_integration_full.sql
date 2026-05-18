-- vsDesk integration: mapping + extra fields for attachments/history/users/customfields

-- 1) Маппинг статусов vsDesk -> наши статусы
CREATE TABLE IF NOT EXISTS vsdesk_status_mapping (
    id SERIAL PRIMARY KEY,
    vsdesk_status VARCHAR(200) NOT NULL UNIQUE,
    status_id INTEGER NULL REFERENCES ticket_statuses(id),
    sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vsdesk_status_mapping_status_id ON vsdesk_status_mapping(status_id);

-- 2) Таблица вложений к заявке (отдельная от комментариев)
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    uploaded_by INTEGER NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    external_id VARCHAR(100) NULL,
    external_source VARCHAR(50) NULL
);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ext ON ticket_attachments(external_source, external_id);

-- 3) external_id для истории
ALTER TABLE ticket_history
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ext ON ticket_history(external_source, external_id);

-- 4) external_id для вложений комментариев
ALTER TABLE comment_attachments
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_ext ON comment_attachments(external_source, external_id);

-- 5) external метки для пользователей (импортированные из vsDesk)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS external_source VARCHAR(50),
    ADD COLUMN IF NOT EXISTS can_login BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_users_ext ON users(external_source, external_id);

-- 6) external_id у custom field values
ALTER TABLE ticket_custom_field_values
    ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);

-- 7) Системный пользователь "vsDesk import" для author-fallback
INSERT INTO users (email, password_hash, full_name, username, is_active, can_login, external_source, external_id)
SELECT 'vsdesk-import@system.local', 'NO_LOGIN', 'vsDesk (импорт)', 'vsdesk_import', TRUE, FALSE, 'vsdesk', 'system'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE external_source='vsdesk' AND external_id='system'
);
