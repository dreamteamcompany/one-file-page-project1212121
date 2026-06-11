-- Статус "Ожидает подтверждения" (id=16) должен быть виден заказчику (роль "Пользователь", id=7),
-- иначе на фронте не определяется is_pending_confirmation и заказчику не показывается
-- кнопка подтверждения/отклонения заявки.
INSERT INTO t_p67567221_one_file_page_projec.ticket_status_roles (status_id, role_id)
SELECT 16, 7
WHERE NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.ticket_status_roles
    WHERE status_id = 16 AND role_id = 7
);