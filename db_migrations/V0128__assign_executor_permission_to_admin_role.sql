INSERT INTO role_permissions (role_id, permission_id)
VALUES (1, 92)
ON CONFLICT (role_id, permission_id) DO NOTHING;
