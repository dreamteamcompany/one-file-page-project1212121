-- Добавление разрешений для services и ticket services  
INSERT INTO permissions (name, resource, action, description) VALUES
('services.read', 'services', 'read', 'Просмотр сервисов'),
('services.create', 'services', 'create', 'Создание сервисов'),
('services.update', 'services', 'update', 'Редактирование сервисов'),
('ticket_services.read', 'ticket_services', 'read', 'Просмотр услуг заявок'),
('ticket_services.create', 'ticket_services', 'create', 'Создание услуг заявок'),
('ticket_services.update', 'ticket_services', 'update', 'Редактирование услуг заявок'),
('ticket_service_categories.read', 'ticket_service_categories', 'read', 'Просмотр категорий услуг'),
('ticket_service_categories.create', 'ticket_service_categories', 'create', 'Создание категорий услуг'),
('ticket_service_categories.update', 'ticket_service_categories', 'update', 'Редактирование категорий услуг');