-- Добавляем права для работы с SLA
INSERT INTO t_p67567221_one_file_page_projec.permissions (name, resource, action, description) 
VALUES 
('sla:read', 'sla', 'read', 'Просмотр SLA'),
('sla:create', 'sla', 'create', 'Создание SLA'),
('sla:update', 'sla', 'update', 'Редактирование SLA'),
('sla:remove', 'sla', 'remove', 'Удаление SLA');
