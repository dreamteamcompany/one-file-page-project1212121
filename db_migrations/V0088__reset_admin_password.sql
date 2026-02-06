-- Сброс пароля для admin на "admin123"
-- Bcrypt hash для "admin123": $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpZFW4YW9m86

UPDATE t_p67567221_one_file_page_projec.users 
SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpZFW4YW9m86'
WHERE username = 'admin';
