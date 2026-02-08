-- Шаг 1: Создаём новую таблицу с правильной структурой
CREATE TABLE t_p67567221_one_file_page_projec.users_new (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Шаг 2: Копируем все данные из старой таблицы
INSERT INTO t_p67567221_one_file_page_projec.users_new 
    (id, username, email, password_hash, full_name, position, photo_url, is_active, created_at, updated_at, last_login)
SELECT 
    id, 
    username, 
    email, 
    password_hash, 
    full_name, 
    COALESCE(position, ''),
    COALESCE(photo_url, ''),
    is_active, 
    created_at, 
    updated_at, 
    last_login
FROM t_p67567221_one_file_page_projec.users;

-- Шаг 3: Удаляем старую таблицу (CASCADE удалит все зависимости)
DROP TABLE t_p67567221_one_file_page_projec.users CASCADE;

-- Шаг 4: Переименовываем новую таблицу
ALTER TABLE t_p67567221_one_file_page_projec.users_new RENAME TO users;

-- Шаг 5: Синхронизируем sequence
SELECT setval('t_p67567221_one_file_page_projec.users_id_seq', 
              (SELECT COALESCE(MAX(id), 1) FROM t_p67567221_one_file_page_projec.users));
