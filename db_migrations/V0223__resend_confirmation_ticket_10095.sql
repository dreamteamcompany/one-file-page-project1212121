-- Единичный фикс заявки #10095: Дарья сменила статус на "Ожидает подтверждения"
-- вручную через сайдбар вместо кнопки "Отправить на подтверждение".
-- В итоге Лина не получила уведомление. Перевзвешиваем подтверждение вручную.

-- 1) Освежить confirmation_sent_at и сбросить флаг авто-закрытия
UPDATE t_p67567221_one_file_page_projec.tickets
SET confirmation_sent_at = NOW(),
    auto_close_notified = false,
    updated_at = NOW()
WHERE id = 10095;

-- 2) Запись в историю заявки (аудит ручного фикса)
INSERT INTO t_p67567221_one_file_page_projec.ticket_history
    (ticket_id, user_id, field_name, old_value, new_value, created_at)
VALUES
    (10095, 23, 'confirmation_resent', NULL, 'manual_resend_admin_fix', NOW());

-- 3) Создать уведомление заказчику (Лине Кобычевой, id=14)
INSERT INTO t_p67567221_one_file_page_projec.notifications
    (user_id, ticket_id, type, event_type, actor_id, message, is_read, created_at, updated_at)
VALUES
    (14, 10095, 'ticket_pending_confirmation', 'ticket_pending_confirmation', 23,
     'Заявка #10095 ждёт вашего подтверждения. Откройте, чтобы принять или отклонить работу исполнителя.',
     false, NOW(), NOW());