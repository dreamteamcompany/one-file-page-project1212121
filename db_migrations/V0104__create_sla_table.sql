-- Создание таблицы SLA (Service Level Agreements)
CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.sla (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    response_time_hours INTEGER NOT NULL CHECK (response_time_hours > 0),
    response_notification_hours INTEGER NOT NULL CHECK (response_notification_hours > 0),
    no_response_hours INTEGER CHECK (no_response_hours > 0),
    no_response_status_id INTEGER REFERENCES t_p67567221_one_file_page_projec.ticket_statuses(id),
    resolution_time_hours INTEGER NOT NULL CHECK (resolution_time_hours > 0),
    resolution_notification_hours INTEGER NOT NULL CHECK (resolution_notification_hours > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_response_notification CHECK (response_notification_hours < response_time_hours),
    CONSTRAINT check_resolution_notification CHECK (resolution_notification_hours < resolution_time_hours)
);

CREATE INDEX IF NOT EXISTS idx_sla_name ON t_p67567221_one_file_page_projec.sla(name);

COMMENT ON TABLE t_p67567221_one_file_page_projec.sla IS 'Соглашения об уровне обслуживания (SLA)';
COMMENT ON COLUMN t_p67567221_one_file_page_projec.sla.response_time_hours IS 'Время реакции на заявку (часы)';
COMMENT ON COLUMN t_p67567221_one_file_page_projec.sla.response_notification_hours IS 'За сколько часов до окончания времени реакции отправить уведомление';
COMMENT ON COLUMN t_p67567221_one_file_page_projec.sla.no_response_hours IS 'Часов без ответа клиента для автоматического перевода статуса';
COMMENT ON COLUMN t_p67567221_one_file_page_projec.sla.no_response_status_id IS 'Статус для автоматического перевода при отсутствии ответа';
COMMENT ON COLUMN t_p67567221_one_file_page_projec.sla.resolution_time_hours IS 'Время решения заявки (часы)';
COMMENT ON COLUMN t_p67567221_one_file_page_projec.sla.resolution_notification_hours IS 'За сколько часов до окончания времени решения отправить уведомление';
