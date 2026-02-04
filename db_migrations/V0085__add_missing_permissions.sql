-- Добавляем недостающие права remove для существующих ресурсов
INSERT INTO permissions (name, description, resource, action)
SELECT 'categories.remove', 'Удаление категорий', 'categories', 'remove'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'categories' AND action = 'remove');

INSERT INTO permissions (name, description, resource, action)
SELECT 'roles.remove', 'Удаление ролей', 'roles', 'remove'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'roles' AND action = 'remove');

INSERT INTO permissions (name, description, resource, action)
SELECT 'users.remove', 'Удаление пользователей', 'users', 'remove'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'users' AND action = 'remove');

INSERT INTO permissions (name, description, resource, action)
SELECT 'services.remove', 'Удаление услуг', 'services', 'remove'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'services' AND action = 'remove');

INSERT INTO permissions (name, description, resource, action)
SELECT 'ticket_services.remove', 'Удаление услуг заявок', 'ticket_services', 'remove'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'ticket_services' AND action = 'remove');

INSERT INTO permissions (name, description, resource, action)
SELECT 'ticket_service_categories.remove', 'Удаление категорий услуг', 'ticket_service_categories', 'remove'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'ticket_service_categories' AND action = 'remove');

-- Добавляем права для контрагентов
INSERT INTO permissions (name, description, resource, action) VALUES
('contractors.create', 'Создание контрагентов', 'contractors', 'create'),
('contractors.read', 'Просмотр контрагентов', 'contractors', 'read'),
('contractors.update', 'Редактирование контрагентов', 'contractors', 'update'),
('contractors.remove', 'Удаление контрагентов', 'contractors', 'remove');

-- Добавляем права для юридических лиц
INSERT INTO permissions (name, description, resource, action) VALUES
('legal_entities.create', 'Создание юр.лиц', 'legal_entities', 'create'),
('legal_entities.read', 'Просмотр юр.лиц', 'legal_entities', 'read'),
('legal_entities.update', 'Редактирование юр.лиц', 'legal_entities', 'update'),
('legal_entities.remove', 'Удаление юр.лиц', 'legal_entities', 'remove');

-- Добавляем права для отделов заказчика
INSERT INTO permissions (name, description, resource, action) VALUES
('customer_departments.create', 'Создание отделов', 'customer_departments', 'create'),
('customer_departments.read', 'Просмотр отделов', 'customer_departments', 'read'),
('customer_departments.update', 'Редактирование отделов', 'customer_departments', 'update'),
('customer_departments.remove', 'Удаление отделов', 'customer_departments', 'remove');

-- Добавляем права для permissions (управление правами)
INSERT INTO permissions (name, description, resource, action) VALUES
('permissions.create', 'Создание прав доступа', 'permissions', 'create'),
('permissions.read', 'Просмотр прав доступа', 'permissions', 'read'),
('permissions.update', 'Редактирование прав доступа', 'permissions', 'update'),
('permissions.remove', 'Удаление прав доступа', 'permissions', 'remove');

-- Добавляем права для комментариев к заявкам
INSERT INTO permissions (name, description, resource, action) VALUES
('ticket_comments.create', 'Добавление комментариев', 'ticket_comments', 'create'),
('ticket_comments.read', 'Просмотр комментариев', 'ticket_comments', 'read'),
('ticket_comments.update', 'Редактирование комментариев', 'ticket_comments', 'update'),
('ticket_comments.remove', 'Удаление комментариев', 'ticket_comments', 'remove');

-- Добавляем права для уведомлений
INSERT INTO permissions (name, description, resource, action) VALUES
('notifications.read', 'Просмотр уведомлений', 'notifications', 'read'),
('notifications.update', 'Отметка прочитанных', 'notifications', 'update'),
('notifications.remove', 'Удаление уведомлений', 'notifications', 'remove');