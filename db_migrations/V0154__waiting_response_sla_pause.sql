-- Поля для паузы SLA и автоматических напоминаний при waiting-статусе
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS sla_paused_total_seconds INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS waiting_reminder_sent_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS previous_status_id INTEGER NULL REFERENCES ticket_statuses(id);

-- Настройки waiting (создаём если нет)
INSERT INTO system_settings (key, value, description)
VALUES ('waiting_reminder_days', '7', 'Через сколько дней клиенту отправляется напоминание о необходимости ответа')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description)
VALUES ('waiting_autoclose_days', '14', 'Через сколько дней без ответа клиента заявка автоматически закрывается')
ON CONFLICT (key) DO NOTHING;
