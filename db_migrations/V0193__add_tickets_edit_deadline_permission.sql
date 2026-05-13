-- Право на редактирование дедлайна тикета
INSERT INTO t_p67567221_one_file_page_projec.permissions (name, description, resource, action)
VALUES ('tickets.edit_deadline', 'Редактирование дедлайна', 'tickets', 'edit_deadline')
ON CONFLICT DO NOTHING;

-- По умолчанию — роль "Исполнитель" (id=8). Админ всегда имеет все права (через hasPermission в коде).
INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 8, p.id
FROM t_p67567221_one_file_page_projec.permissions p
WHERE p.resource = 'tickets' AND p.action = 'edit_deadline'
ON CONFLICT DO NOTHING;
