-- Перенумерация заявок: 10101 -> 9757 (07.05.2026 11:42 UTC), 10102 -> 9759 (07.05.2026 11:53 UTC).

-- 10101 -> 9757
UPDATE t_p67567221_one_file_page_projec.tickets                    SET id = 9757, created_at = '2026-05-07 11:42:00'::timestamp WHERE id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_attachments         SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_comments            SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_history             SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_custom_field_values SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_approvals           SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_approvers           SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_watchers            SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_views               SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_group_log           SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.ticket_to_service_mappings SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.sla_violations             SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.notifications              SET ticket_id = 9757 WHERE ticket_id = 10101;
UPDATE t_p67567221_one_file_page_projec.kb_article_tickets         SET ticket_id = 9757 WHERE ticket_id = 10101;

-- 10102 -> 9759
UPDATE t_p67567221_one_file_page_projec.tickets                    SET id = 9759, created_at = '2026-05-07 11:53:00'::timestamp WHERE id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_attachments         SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_comments            SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_history             SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_custom_field_values SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_approvals           SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_approvers           SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_watchers            SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_views               SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_group_log           SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.ticket_to_service_mappings SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.sla_violations             SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.notifications              SET ticket_id = 9759 WHERE ticket_id = 10102;
UPDATE t_p67567221_one_file_page_projec.kb_article_tickets         SET ticket_id = 9759 WHERE ticket_id = 10102;
