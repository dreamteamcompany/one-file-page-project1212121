INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 9, p.id
FROM t_p67567221_one_file_page_projec.permissions p
WHERE p.resource = 'settings' AND p.action IN ('read', 'update')
  AND NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.role_permissions rp
    WHERE rp.role_id = 9 AND rp.permission_id = p.id
  );