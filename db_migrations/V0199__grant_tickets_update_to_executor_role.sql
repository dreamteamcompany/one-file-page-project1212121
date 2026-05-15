INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 8, 24
WHERE NOT EXISTS (
  SELECT 1 FROM t_p67567221_one_file_page_projec.role_permissions
  WHERE role_id = 8 AND permission_id = 24
);