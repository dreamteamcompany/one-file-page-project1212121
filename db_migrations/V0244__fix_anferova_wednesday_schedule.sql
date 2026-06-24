-- Исправление опечатки в графике Виктории Анферовой (user_id=20):
-- среда (day_of_week=2) была 07:00->06:00 (ночная смена через полночь),
-- должно быть 07:00->16:00, как в остальные её рабочие дни.
UPDATE work_schedules
SET end_time = '16:00:00', updated_at = NOW()
WHERE user_id = 20 AND day_of_week = 2 AND start_time = '07:00:00' AND end_time = '06:00:00';
