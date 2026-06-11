INSERT INTO t_p67567221_one_file_page_projec.roles (name, description, system_role)
SELECT
    'Администратор разработки МИС (Лина)',
    description,
    system_role
FROM t_p67567221_one_file_page_projec.roles
WHERE name = 'Пользователь' AND system_role = 'user'
ORDER BY id LIMIT 1;

INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM t_p67567221_one_file_page_projec.roles
     WHERE name = 'Администратор разработки МИС (Лина)' AND system_role = 'user'
     ORDER BY id DESC LIMIT 1),
    rp.permission_id
FROM t_p67567221_one_file_page_projec.role_permissions rp
WHERE rp.role_id = (
    SELECT id FROM t_p67567221_one_file_page_projec.roles
    WHERE name = 'Пользователь' AND system_role = 'user'
    ORDER BY id LIMIT 1
);