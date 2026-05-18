-- Добавим тип задачи: import (новые) или delta (обновление существующих)
ALTER TABLE vsdesk_sync_jobs
    ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) NOT NULL DEFAULT 'import';
