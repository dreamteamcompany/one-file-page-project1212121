-- Расширяем таблицу departments для древовидной структуры
ALTER TABLE t_p67567221_one_file_page_projec.departments 
    ADD COLUMN IF NOT EXISTS company_id INTEGER,
    ADD COLUMN IF NOT EXISTS parent_id INTEGER,
    ADD COLUMN IF NOT EXISTS code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Создаем индексы для departments
CREATE INDEX IF NOT EXISTS idx_departments_company ON t_p67567221_one_file_page_projec.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON t_p67567221_one_file_page_projec.departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON t_p67567221_one_file_page_projec.departments(name);

-- Создаем таблицу должностей
CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_name ON t_p67567221_one_file_page_projec.positions(name);

-- Создаем таблицу связи подразделений и должностей
CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.department_positions (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL,
    position_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_department_positions_department ON t_p67567221_one_file_page_projec.department_positions(department_id);
CREATE INDEX IF NOT EXISTS idx_department_positions_position ON t_p67567221_one_file_page_projec.department_positions(position_id);

-- Добавляем индексы для companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON t_p67567221_one_file_page_projec.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_inn ON t_p67567221_one_file_page_projec.companies(inn);

-- Обновляем таблицу users
ALTER TABLE t_p67567221_one_file_page_projec.users 
    ADD COLUMN IF NOT EXISTS company_id INTEGER,
    ADD COLUMN IF NOT EXISTS department_id INTEGER,
    ADD COLUMN IF NOT EXISTS position_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_company ON t_p67567221_one_file_page_projec.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON t_p67567221_one_file_page_projec.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_position ON t_p67567221_one_file_page_projec.users(position_id);

-- Вставляем тестовые компании
INSERT INTO t_p67567221_one_file_page_projec.companies (name, inn, legal_address) VALUES
    ('ООО "Рога и Копыта"', '7707083893', 'г. Москва, ул. Ленина, д. 1'),
    ('ООО "Техносервис"', '7707083894', 'г. Санкт-Петербург, Невский пр., д. 10')
ON CONFLICT DO NOTHING;

-- Вставляем типовые должности
INSERT INTO t_p67567221_one_file_page_projec.positions (name, description) VALUES
    ('Директор', 'Руководитель компании'),
    ('Заместитель директора', 'Заместитель руководителя'),
    ('Начальник отдела', 'Руководитель отдела'),
    ('Ведущий специалист', 'Опытный специалист'),
    ('Специалист', 'Рядовой специалист'),
    ('Инженер', 'Технический специалист'),
    ('Старший инженер', 'Опытный технический специалист'),
    ('Программист', 'Разработчик ПО'),
    ('Тимлид', 'Руководитель команды разработки'),
    ('Бухгалтер', 'Финансовый специалист'),
    ('Главный бухгалтер', 'Руководитель бухгалтерии')
ON CONFLICT (name) DO NOTHING;