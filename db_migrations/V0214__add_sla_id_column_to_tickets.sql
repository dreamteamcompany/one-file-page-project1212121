-- Добавляем колонку sla_id в tickets и проставляем её из существующих маппингов услуг
ALTER TABLE t_p67567221_one_file_page_projec.tickets
  ADD COLUMN IF NOT EXISTS sla_id INTEGER REFERENCES t_p67567221_one_file_page_projec.sla(id);

-- Бэкфилл sla_id для существующих заявок: для каждой заявки находим подходящий SLA по связке услуг
UPDATE t_p67567221_one_file_page_projec.tickets t
SET sla_id = (
    SELECT s.id
    FROM t_p67567221_one_file_page_projec.sla s
    JOIN t_p67567221_one_file_page_projec.sla_service_mappings ssm ON s.id = ssm.sla_id
    JOIN t_p67567221_one_file_page_projec.ticket_to_service_mappings tsm ON
        (ssm.ticket_service_id = tsm.ticket_service_id AND ssm.service_id = tsm.service_id)
        OR (ssm.ticket_service_id = tsm.ticket_service_id AND ssm.service_id IS NULL)
        OR (ssm.ticket_service_id IS NULL AND ssm.service_id = tsm.service_id)
    WHERE tsm.ticket_id = t.id
    ORDER BY
        (CASE WHEN ssm.ticket_service_id IS NOT NULL AND ssm.service_id IS NOT NULL THEN 1
              WHEN ssm.ticket_service_id IS NOT NULL THEN 2
              WHEN ssm.service_id IS NOT NULL THEN 3
              ELSE 4 END)
    LIMIT 1
)
WHERE t.sla_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_sla_id
  ON t_p67567221_one_file_page_projec.tickets(sla_id);
