
ALTER TABLE executor_groups ADD COLUMN IF NOT EXISTS auto_assign_type VARCHAR(20) NOT NULL DEFAULT 'none';

UPDATE executor_groups SET auto_assign_type = CASE WHEN auto_assign = true THEN 'all' ELSE 'none' END;

CREATE TABLE IF NOT EXISTS work_schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_work_schedules_user_id ON work_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_day ON work_schedules(day_of_week);
