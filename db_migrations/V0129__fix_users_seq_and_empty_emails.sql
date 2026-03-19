-- Fix empty emails to unique placeholders
UPDATE t_p67567221_one_file_page_projec.users 
SET email = 'no-email-' || id || '@placeholder.local' 
WHERE email = '';

-- Fix users_id_seq to correct value
SELECT setval('t_p67567221_one_file_page_projec.users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM t_p67567221_one_file_page_projec.users), true);