-- Изменяем тип поля due_date на timestamp with time zone для сохранения времени дедлайна
ALTER TABLE t_p67567221_one_file_page_projec.tickets 
ALTER COLUMN due_date TYPE timestamp with time zone 
USING due_date::timestamp with time zone;