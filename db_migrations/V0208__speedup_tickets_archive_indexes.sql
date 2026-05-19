-- Ускорение списка заявок: составные и одиночные индексы
-- Главная боль: архив с 5000+ заявок отваливался по таймауту 30 сек

-- Главный индекс под архив: (is_archived, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_tickets_archived_created
  ON t_p67567221_one_file_page_projec.tickets (is_archived, created_at DESC);

-- Для активного списка
CREATE INDEX IF NOT EXISTS idx_tickets_created_at
  ON t_p67567221_one_file_page_projec.tickets (created_at DESC);

-- Для EXISTS-ов и фильтров по статусу
CREATE INDEX IF NOT EXISTS idx_tickets_status_id
  ON t_p67567221_one_file_page_projec.tickets (status_id);

-- Для view_own_only и фильтра по исполнителю
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to
  ON t_p67567221_one_file_page_projec.tickets (assigned_to);

-- Для view_own_only и фильтра по автору
CREATE INDEX IF NOT EXISTS idx_tickets_created_by
  ON t_p67567221_one_file_page_projec.tickets (created_by);

-- Для подсчёта непрочитанных комментариев и сортировок
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id
  ON t_p67567221_one_file_page_projec.ticket_comments (ticket_id, created_at DESC);

-- Обновляем статистику оптимизатора
ANALYZE t_p67567221_one_file_page_projec.tickets;
ANALYZE t_p67567221_one_file_page_projec.ticket_comments;
ANALYZE t_p67567221_one_file_page_projec.ticket_watchers;
ANALYZE t_p67567221_one_file_page_projec.ticket_approvals;
