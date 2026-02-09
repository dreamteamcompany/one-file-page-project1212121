-- Добавляем категорию прав доступа "Модификаторы доступа к заявкам"
-- и право "Видит только свои заявки"

INSERT INTO permissions (name, resource, action, description)
VALUES 
  ('tickets.view_own_only', 'tickets', 'view_own_only', 'Видит только свои заявки (в т.ч в качестве наблюдателя/согласующего)')
ON CONFLICT (name) DO NOTHING;
