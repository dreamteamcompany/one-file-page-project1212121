INSERT INTO t_p67567221_one_file_page_projec.system_settings (key, value, description)
VALUES ('default_executor_group_id', '', 'ID группы исполнителей по умолчанию (пусто — выключено)')
ON CONFLICT (key) DO NOTHING;