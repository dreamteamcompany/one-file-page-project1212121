-- Добавляем поле is_read в таблицу ticket_comments
ALTER TABLE t_p67567221_one_file_page_projec.ticket_comments 
ADD COLUMN is_read BOOLEAN DEFAULT FALSE;