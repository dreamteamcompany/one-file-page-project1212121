-- Добавляем недостающие колонки в таблицу users
ALTER TABLE t_p67567221_one_file_page_projec.users 
ADD COLUMN IF NOT EXISTS position VARCHAR(255) DEFAULT '',
ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
