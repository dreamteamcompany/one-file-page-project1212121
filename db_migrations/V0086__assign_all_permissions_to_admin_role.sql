-- Добавляем все права к роли "Администратор" (id=1)
-- Используем INSERT ... ON CONFLICT DO NOTHING чтобы избежать дубликатов
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id
FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 1 AND rp.permission_id = p.id
);