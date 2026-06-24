-- Флаг "таймер на паузе" для статусов. Статус с is_paused=true приостанавливает SLA-таймер.
ALTER TABLE ticket_statuses ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE;

-- Статус "Приостановлена" ставит таймер на паузу.
UPDATE ticket_statuses SET is_paused = TRUE WHERE name = 'Приостановлена';
