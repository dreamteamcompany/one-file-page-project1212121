-- Добавление прав для управления приоритетами заявок
INSERT INTO t_p67567221_one_file_page_projec.permissions (name, resource, action, description) VALUES
('Создание приоритетов заявок', 'ticket_priorities', 'create', 'Создание приоритетов заявок'),
('Просмотр приоритетов заявок', 'ticket_priorities', 'read', 'Просмотр приоритетов заявок'),
('Редактирование приоритетов заявок', 'ticket_priorities', 'update', 'Редактирование приоритетов заявок'),
('Удаление приоритетов заявок', 'ticket_priorities', 'remove', 'Удаление приоритетов заявок');

-- Привязываем права к роли "Администратор" (role_id = 1)
INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 1, p.id
FROM t_p67567221_one_file_page_projec.permissions p
WHERE p.resource = 'ticket_priorities';
