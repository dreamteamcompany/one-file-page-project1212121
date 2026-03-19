INSERT INTO permissions (name, description, resource, action)
VALUES ('tickets.assign_executor', 'Назначать и редактировать исполнителя в заявках', 'tickets', 'assign_executor')
ON CONFLICT (resource, action) DO NOTHING;
