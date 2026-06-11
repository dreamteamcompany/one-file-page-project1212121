INSERT INTO t_p67567221_one_file_page_projec.roles (name, description, system_role)
VALUES (
    'Администратор технической поддержки',
    'Полный доступ ко всем функциям системы',
    'admin'
);

INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM t_p67567221_one_file_page_projec.roles
     WHERE name = 'Администратор технической поддержки' AND system_role = 'admin'
     ORDER BY id DESC LIMIT 1),
    rp.permission_id
FROM t_p67567221_one_file_page_projec.role_permissions rp
WHERE rp.role_id = (
    SELECT id FROM t_p67567221_one_file_page_projec.roles
    WHERE name = 'Администратор' AND system_role = 'admin'
    ORDER BY id LIMIT 1
);