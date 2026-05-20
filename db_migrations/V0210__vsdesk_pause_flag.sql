CREATE TABLE IF NOT EXISTS vsdesk_settings (
  id INT PRIMARY KEY DEFAULT 1,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  paused_reason TEXT,
  paused_at TIMESTAMP,
  paused_by INT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vsdesk_settings_singleton CHECK (id = 1)
);

INSERT INTO vsdesk_settings (id, paused, paused_reason, paused_at)
VALUES (1, TRUE, 'Поставлено на паузу до починки логики', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE
SET paused = TRUE,
    paused_reason = EXCLUDED.paused_reason,
    paused_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;
