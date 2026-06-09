ALTER TABLE t_p67567221_one_file_page_projec.services
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO t_p67567221_one_file_page_projec.services (name, description, final_approver_id, is_system)
SELECT 'Вся услуга (без сервиса)', 'Технический сервис для привязки исполнителя ко всей услуге', 1, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.services WHERE is_system = TRUE
);