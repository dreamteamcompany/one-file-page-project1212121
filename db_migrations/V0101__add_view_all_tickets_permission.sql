-- Добавление права "Видит все заявки"
INSERT INTO permissions (name, resource, action, description)
VALUES ('Видит все заявки', 'tickets', 'view_all', 'Позволяет видеть все заявки в системе, включая заявки других пользователей')
ON CONFLICT (resource, action) DO NOTHING;