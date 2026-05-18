-- Права для базы знаний
INSERT INTO permissions (name, description, resource, action)
SELECT 'Просмотр базы знаний', 'Чтение статей в базе знаний', 'knowledge_base', 'read'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource='knowledge_base' AND action='read');

INSERT INTO permissions (name, description, resource, action)
SELECT 'Создание статей базы знаний', 'Создание новых статей', 'knowledge_base', 'create'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource='knowledge_base' AND action='create');

INSERT INTO permissions (name, description, resource, action)
SELECT 'Редактирование статей', 'Изменение существующих статей', 'knowledge_base', 'update'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource='knowledge_base' AND action='update');

INSERT INTO permissions (name, description, resource, action)
SELECT 'Удаление статей', 'Удаление статей и категорий', 'knowledge_base', 'remove'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource='knowledge_base' AND action='remove');

INSERT INTO permissions (name, description, resource, action)
SELECT 'Запись в базу знаний', 'Полный доступ на редактирование базы знаний', 'knowledge_base', 'write'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource='knowledge_base' AND action='write');

-- Выдаем всем существующим ролям с правом settings.update — write для базы знаний
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, (SELECT id FROM permissions WHERE resource='knowledge_base' AND action='read')
FROM role_permissions rp
JOIN permissions p ON p.id=rp.permission_id
WHERE p.resource='dashboard' AND p.action='read'
ON CONFLICT DO NOTHING;
