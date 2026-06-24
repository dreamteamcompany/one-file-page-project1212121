-- Новое право "Доступ к разделу Пользователи": одно право даёт полный доступ к разделу
-- (просмотр, создание, редактирование, блокировка, удаление учёток).
INSERT INTO permissions (name, description, resource, action)
SELECT 'users.access', 'Доступ к разделу Пользователи (полный доступ)', 'users', 'access'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE resource = 'users' AND action = 'access'
);
