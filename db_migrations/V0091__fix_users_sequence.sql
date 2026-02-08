-- Создаём sequence для users.id с правильной схемой
CREATE SEQUENCE IF NOT EXISTS t_p67567221_one_file_page_projec.users_id_seq 
    START WITH 2 
    INCREMENT BY 1 
    NO MINVALUE 
    NO MAXVALUE 
    CACHE 1;

-- Синхронизируем значение sequence с текущим максимальным ID
SELECT setval('t_p67567221_one_file_page_projec.users_id_seq', 
              (SELECT COALESCE(MAX(id), 1) FROM t_p67567221_one_file_page_projec.users));
