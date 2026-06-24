-- Заменяем уникальное ограничение (ticket_id, ticket_service_id) на (ticket_id, service_id),
-- чтобы несколько сервисов одной услуги (например 1С и Битрикс внутри "Предоставить доступ")
-- сохранялись в одной заявке, а не отбрасывались через ON CONFLICT DO NOTHING.

ALTER TABLE ticket_to_service_mappings
  DROP CONSTRAINT IF EXISTS ticket_to_service_mappings_ticket_id_ticket_service_id_key;

ALTER TABLE ticket_to_service_mappings
  ADD CONSTRAINT ticket_to_service_mappings_ticket_id_service_id_key
  UNIQUE (ticket_id, service_id);
