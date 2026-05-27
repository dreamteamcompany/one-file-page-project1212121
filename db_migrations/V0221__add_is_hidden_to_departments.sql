ALTER TABLE departments
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_departments_is_hidden ON departments(is_hidden);