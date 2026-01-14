-- Назначение разрешений администратору
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE name IN (
  'services.read', 'services.create', 'services.update',
  'ticket_services.read', 'ticket_services.create', 'ticket_services.update',
  'ticket_service_categories.read', 'ticket_service_categories.create', 'ticket_service_categories.update'
);