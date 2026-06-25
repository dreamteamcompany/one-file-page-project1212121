UPDATE t_p67567221_one_file_page_projec.tickets
SET assigned_to = 20,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
    SELECT id
    FROM t_p67567221_one_file_page_projec.tickets
    WHERE assigned_to = 3
      AND status_id IN (7, 16)
      AND is_archived = false
    ORDER BY created_at DESC
    LIMIT 37
);