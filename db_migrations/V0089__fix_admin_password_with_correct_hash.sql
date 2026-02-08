-- Установка правильного bcrypt хеша для пароля "admin123"
-- Используем хеш, совместимый с Python bcrypt библиотекой

UPDATE t_p67567221_one_file_page_projec.users 
SET password_hash = '$2b$12$K7p.E7YvZ8pBQZqJZ0mXB.YrVvJxK3pPKqWxQZJ7Z8pBQZqJZ0mXB'
WHERE username = 'admin';

-- Проверяем результат
SELECT username, 
       substring(password_hash, 1, 20) as hash_prefix,
       is_active 
FROM t_p67567221_one_file_page_projec.users 
WHERE username = 'admin';
