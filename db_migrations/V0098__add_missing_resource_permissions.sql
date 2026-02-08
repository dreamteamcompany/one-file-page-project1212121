-- Добавляем права для dashboard
INSERT INTO permissions (resource, action, name) VALUES
('dashboard', 'read', 'dashboard.read');

-- Добавляем права для field_registry
INSERT INTO permissions (resource, action, name) VALUES
('field_registry', 'create', 'field_registry.create'),
('field_registry', 'read', 'field_registry.read'),
('field_registry', 'update', 'field_registry.update'),
('field_registry', 'remove', 'field_registry.remove');

-- Добавляем права для custom_field_groups
INSERT INTO permissions (resource, action, name) VALUES
('custom_field_groups', 'create', 'custom_field_groups.create'),
('custom_field_groups', 'read', 'custom_field_groups.read'),
('custom_field_groups', 'update', 'custom_field_groups.update'),
('custom_field_groups', 'remove', 'custom_field_groups.remove');

-- Добавляем права для service_field_mappings
INSERT INTO permissions (resource, action, name) VALUES
('service_field_mappings', 'create', 'service_field_mappings.create'),
('service_field_mappings', 'read', 'service_field_mappings.read'),
('service_field_mappings', 'update', 'service_field_mappings.update'),
('service_field_mappings', 'remove', 'service_field_mappings.remove');

-- Добавляем права для ticket_statuses
INSERT INTO permissions (resource, action, name) VALUES
('ticket_statuses', 'create', 'ticket_statuses.create'),
('ticket_statuses', 'read', 'ticket_statuses.read'),
('ticket_statuses', 'update', 'ticket_statuses.update'),
('ticket_statuses', 'remove', 'ticket_statuses.remove');

-- Добавляем права для settings
INSERT INTO permissions (resource, action, name) VALUES
('settings', 'read', 'settings.read'),
('settings', 'update', 'settings.update');

-- Добавляем права для log_analyzer
INSERT INTO permissions (resource, action, name) VALUES
('log_analyzer', 'read', 'log_analyzer.read');