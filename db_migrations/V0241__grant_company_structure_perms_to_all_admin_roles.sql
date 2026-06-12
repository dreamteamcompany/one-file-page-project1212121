INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM t_p67567221_one_file_page_projec.roles r
CROSS JOIN t_p67567221_one_file_page_projec.permissions p
WHERE r.system_role = 'admin'
  AND p.resource IN ('companies','departments','positions')
  AND NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );