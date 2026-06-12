INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 9, p.id
FROM t_p67567221_one_file_page_projec.permissions p
WHERE p.resource IN (
    'ticket_statuses',
    'field_registry',
    'custom_field_groups',
    'service_field_mappings',
    'log_analyzer'
)
  AND NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.role_permissions rp
    WHERE rp.role_id = 9 AND rp.permission_id = p.id
  );