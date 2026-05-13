-- Явно выдаём право tickets.edit_deadline роли "Администратор" (id=1),
-- чтобы оно отображалось в UI настройки ролей. Поведение в коде не меняется:
-- админ и так получает все права через проверку имени роли.
INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 1, p.id
FROM t_p67567221_one_file_page_projec.permissions p
WHERE p.resource = 'tickets' AND p.action = 'edit_deadline'
ON CONFLICT DO NOTHING;
