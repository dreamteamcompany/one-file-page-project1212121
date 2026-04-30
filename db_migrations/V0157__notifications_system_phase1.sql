-- Phase 1: Унифицированная система индикации непрочитанного

-- 1) Расширяем notifications: классификация событий
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS actor_id INTEGER,
    ADD COLUMN IF NOT EXISTS comment_id INTEGER,
    ADD COLUMN IF NOT EXISTS payload JSONB;

-- Индексы для быстрых счётчиков
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read)
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_ticket
    ON notifications(user_id, ticket_id);

CREATE INDEX IF NOT EXISTS idx_notifications_event_type
    ON notifications(event_type);

-- 2) Индивидуальный last_seen на пару (user, ticket)
CREATE TABLE IF NOT EXISTS ticket_views (
    user_id INTEGER NOT NULL,
    ticket_id INTEGER NOT NULL,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_views_ticket ON ticket_views(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_views_user ON ticket_views(user_id);

-- 3) Заполняем ticket_views для всех существующих участников
INSERT INTO ticket_views (user_id, ticket_id, last_seen_at)
SELECT DISTINCT created_by AS user_id, id AS ticket_id, NOW()
FROM tickets WHERE created_by IS NOT NULL
ON CONFLICT (user_id, ticket_id) DO NOTHING;

INSERT INTO ticket_views (user_id, ticket_id, last_seen_at)
SELECT DISTINCT assigned_to AS user_id, id AS ticket_id, NOW()
FROM tickets WHERE assigned_to IS NOT NULL
ON CONFLICT (user_id, ticket_id) DO NOTHING;

INSERT INTO ticket_views (user_id, ticket_id, last_seen_at)
SELECT DISTINCT user_id, ticket_id, NOW()
FROM ticket_watchers
ON CONFLICT (user_id, ticket_id) DO NOTHING;

INSERT INTO ticket_views (user_id, ticket_id, last_seen_at)
SELECT DISTINCT approver_id AS user_id, ticket_id, NOW()
FROM ticket_approvers
ON CONFLICT (user_id, ticket_id) DO NOTHING;
