CREATE TABLE IF NOT EXISTS automation_jobs (
    job_key VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    schedule_preset VARCHAR(32) NOT NULL DEFAULT 'off',
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_run_at TIMESTAMPTZ,
    last_finished_at TIMESTAMPTZ,
    last_status VARCHAR(32),
    last_message TEXT,
    next_run_at TIMESTAMPTZ,
    updated_by_user_id INTEGER,
    updated_by_name VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_runs (
    id BIGSERIAL PRIMARY KEY,
    job_key VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(16) NOT NULL DEFAULT 'auto',
    started_by_user_id INTEGER,
    started_by_name VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'running',
    message TEXT,
    result JSONB
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_job_key_started_at
    ON automation_runs (job_key, started_at DESC);

INSERT INTO automation_jobs (job_key, title, description, enabled, schedule_preset, params)
VALUES
    ('bitrix_sync_positions',
     'Синхронизация с Битрикс',
     'Синхронизирует должности, подразделения и привязки сотрудников из Битрикс24',
     FALSE,
     'off',
     '{"company_id": null}'::jsonb),
    ('bitrix_inactive_users',
     'Проверка неактивных пользователей',
     'Находит и деактивирует пользователей Битрикс24, которые давно не заходили',
     FALSE,
     'off',
     '{"mode": "long_inactive", "days": 30}'::jsonb)
ON CONFLICT (job_key) DO NOTHING;