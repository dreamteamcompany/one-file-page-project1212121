-- Добавляем поле head_user_id для руководителя отдела (Оргструктура)
ALTER TABLE t_p67567221_one_file_page_projec.departments
  ADD COLUMN IF NOT EXISTS head_user_id INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_departments_head_user_id
  ON t_p67567221_one_file_page_projec.departments (head_user_id);

CREATE INDEX IF NOT EXISTS idx_departments_parent_id
  ON t_p67567221_one_file_page_projec.departments (parent_id);

CREATE INDEX IF NOT EXISTS idx_users_department_id
  ON t_p67567221_one_file_page_projec.users (department_id);
