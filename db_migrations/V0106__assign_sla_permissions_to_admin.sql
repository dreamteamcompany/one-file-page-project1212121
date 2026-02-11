-- Назначаем права SLA роли Администратор (role_id = 1)
INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 1, id FROM t_p67567221_one_file_page_projec.permissions WHERE resource = 'sla';
