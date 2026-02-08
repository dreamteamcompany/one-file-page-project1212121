-- Попытка изменить DEFAULT для users.id на правильную последовательность
ALTER TABLE t_p67567221_one_file_page_projec.users 
ALTER COLUMN id SET DEFAULT nextval('t_p67567221_one_file_page_projec.users_id_seq'::regclass);

-- Синхронизируем sequence
SELECT setval('t_p67567221_one_file_page_projec.users_id_seq', 
              (SELECT COALESCE(MAX(id), 1) FROM t_p67567221_one_file_page_projec.users));
