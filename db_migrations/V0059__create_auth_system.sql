-- V0007: Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- V0008: Create roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_name ON roles(name);

-- V0009: Create permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);

-- V0010: Create role_permissions table
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id),
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- V0011: Create user_roles table
CREATE TABLE user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- V0012: Seed default roles and permissions
INSERT INTO roles (name, description) VALUES
('Администратор', 'Полный доступ ко всем функциям системы'),
('Бухгалтер', 'Управление платежами и просмотр отчетов'),
('Просмотр', 'Только просмотр данных без возможности редактирования');

INSERT INTO permissions (name, description, resource, action) VALUES
('payments.create', 'Создание платежей', 'payments', 'create'),
('payments.read', 'Просмотр платежей', 'payments', 'read'),
('payments.update', 'Редактирование платежей', 'payments', 'update'),
('categories.create', 'Создание категорий', 'categories', 'create'),
('categories.read', 'Просмотр категорий', 'categories', 'read'),
('categories.update', 'Редактирование категорий', 'categories', 'update'),
('users.create', 'Создание пользователей', 'users', 'create'),
('users.read', 'Просмотр пользователей', 'users', 'read'),
('users.update', 'Редактирование пользователей', 'users', 'update'),
('roles.create', 'Создание ролей', 'roles', 'create'),
('roles.read', 'Просмотр ролей', 'roles', 'read'),
('roles.update', 'Редактирование ролей', 'roles', 'update');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Администратор';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'Бухгалтер' 
AND p.resource IN ('payments', 'categories');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'Просмотр' 
AND p.action = 'read';

-- V0013: Create admin user
INSERT INTO users (email, password_hash, full_name, is_active) VALUES
('admin@example.com', '$2b$12$Kq8gDwrjo.ZtFPGt3cOoBOijGqsYi06Y0Yb0sxkHhAXjBY7rmtLJO', 'Администратор', true);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.email = 'admin@example.com' AND r.name = 'Администратор';

-- V0015: Add username column
ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
UPDATE users SET username = 'admin' WHERE email = 'admin@example.com';
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE INDEX idx_users_username ON users(username);