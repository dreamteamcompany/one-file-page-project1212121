-- Регистрируем задачу автоперераспределения заявок по сменам в планировщике.
-- Запускается раз в час диспетчером automation-dispatcher.
INSERT INTO automation_jobs (job_key, title, description, enabled, schedule_preset, params)
VALUES
    ('reassign_by_schedule',
     'Перераспределение заявок по сменам',
     'Передаёт открытые заявки исполнителя, у которого закончилась рабочая смена, коллеге из группы (тип «работающему сейчас»), который сейчас на смене. Каждая передача фиксируется в истории заявки.',
     TRUE,
     'hourly',
     '{}'::jsonb)
ON CONFLICT (job_key) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    schedule_preset = EXCLUDED.schedule_preset,
    title = EXCLUDED.title,
    description = EXCLUDED.description;
