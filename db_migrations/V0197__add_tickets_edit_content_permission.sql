-- Право: редактировать содержание заявки (title, description, кастомные поля, вложения, категория/услуга)
INSERT INTO t_p67567221_one_file_page_projec.permissions (name, description, resource, action)
VALUES (
    'tickets.edit_content',
    'Редактировать содержание заявки (заголовок, описание, поля формы, вложения, категорию/услугу)',
    'tickets',
    'edit_content'
)
ON CONFLICT DO NOTHING;

-- Выдаём право администратору
INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM t_p67567221_one_file_page_projec.roles r
CROSS JOIN t_p67567221_one_file_page_projec.permissions p
WHERE p.resource = 'tickets'
  AND p.action  = 'edit_content'
  AND (r.name IN ('Администратор', 'Admin') OR r.id = 1)
ON CONFLICT DO NOTHING;
