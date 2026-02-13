
INSERT INTO permissions (name, resource, action, description) VALUES
('executor_groups.read', 'executor_groups', 'read', 'Просмотр групп исполнителей'),
('executor_groups.create', 'executor_groups', 'create', 'Создание групп исполнителей'),
('executor_groups.update', 'executor_groups', 'update', 'Редактирование групп исполнителей'),
('executor_groups.remove', 'executor_groups', 'remove', 'Удаление групп исполнителей');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE resource = 'executor_groups';
