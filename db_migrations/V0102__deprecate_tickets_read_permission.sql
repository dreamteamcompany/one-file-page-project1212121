-- Помечаем устаревшее право tickets.read как deprecated
-- Меняем описание, чтобы админы понимали, что оно больше не используется
UPDATE t_p67567221_one_file_page_projec.permissions 
SET description = '[УСТАРЕЛО] Используйте view_all или view_own_only вместо этого'
WHERE id = 23 AND resource = 'tickets' AND action = 'read';