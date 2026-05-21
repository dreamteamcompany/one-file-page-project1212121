-- Grant knowledge_base.read to Admin (role_id=1) and Executor (role_id=8)
-- Fixes V0207 where no role got the read permission because dashboard.read was missing at that moment.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.resource = 'knowledge_base'
  AND p.action = 'read'
  AND r.system_role IN ('admin', 'executor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
