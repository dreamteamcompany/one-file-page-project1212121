-- Backfill ticket_group_log: создать активные записи для всех открытых заявок с executor_group_id
INSERT INTO t_p67567221_one_file_page_projec.ticket_group_log
  (ticket_id, executor_group_id, assigned_at, assigned_by, budget_minutes)
SELECT
  t.id AS ticket_id,
  t.executor_group_id,
  COALESCE(t.updated_at, t.created_at) AS assigned_at,
  t.assigned_to AS assigned_by,
  (
    SELECT gb.resolution_minutes
    FROM t_p67567221_one_file_page_projec.sla_group_budgets gb
    WHERE gb.sla_id = (
        SELECT s.id
        FROM t_p67567221_one_file_page_projec.sla s
        JOIN t_p67567221_one_file_page_projec.sla_service_mappings ssm ON s.id = ssm.sla_id
        JOIN t_p67567221_one_file_page_projec.ticket_to_service_mappings tsm ON
            (ssm.ticket_service_id = tsm.ticket_service_id AND ssm.service_id = tsm.service_id)
            OR (ssm.ticket_service_id = tsm.ticket_service_id AND ssm.service_id IS NULL)
            OR (ssm.ticket_service_id IS NULL AND ssm.service_id = tsm.service_id)
        WHERE tsm.ticket_id = t.id
        LIMIT 1
      )
      AND gb.executor_group_id = t.executor_group_id
      AND (gb.priority_id = t.priority_id OR gb.priority_id IS NULL)
    ORDER BY gb.priority_id NULLS LAST
    LIMIT 1
  ) AS budget_minutes
FROM t_p67567221_one_file_page_projec.tickets t
WHERE t.executor_group_id IS NOT NULL
  AND COALESCE(t.is_archived, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.ticket_group_log gl
    WHERE gl.ticket_id = t.id AND gl.released_at IS NULL
  );
