-- Устанавливаем простой пароль "admin123" в открытом виде
UPDATE t_p67567221_one_file_page_projec.users 
SET password_hash = 'PLAIN:admin123'
WHERE username = 'admin';

SELECT username, password_hash FROM t_p67567221_one_file_page_projec.users WHERE username = 'admin';
