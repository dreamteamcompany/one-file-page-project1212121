-- БЕКАП ТАБЛИЦЫ departments ПЕРЕД ВНЕДРЕНИЕМ is_archived И ПЕРЕПИСЫВАНИЕМ bitrix-sync
-- Снимок: 2026-05-26 (перед коммитом миграции V0210)
-- 7 записей, все БЕЗ bitrix_id (то есть созданы вручную, синхронизация Битрикса их не тронет)
-- Для отката иерархии достаточно выполнить эти UPDATE по id и parent_id

-- id=90 → parent_id=NULL ("Финансово-экономический блок ГК", company_id=5)
-- id=91 → parent_id=90 ("Технический директор")
-- id=92 → parent_id=91 ("Служба технической поддержки")
-- id=94 → parent_id=92 ("1-я линия технической поддержки")
-- id=95 → parent_id=92 ("2-я линия технической поддержки")
-- id=96 → parent_id=NULL ("Управляющая компания", company_id=9)
-- id=97 → parent_id=NULL ("Бухгалтерия", company_id=10)

-- Скрипт восстановления parent_id (применять только если иерархия сломана):
UPDATE departments SET parent_id = NULL WHERE id = 90;
UPDATE departments SET parent_id = 90   WHERE id = 91;
UPDATE departments SET parent_id = 91   WHERE id = 92;
UPDATE departments SET parent_id = 92   WHERE id = 94;
UPDATE departments SET parent_id = 92   WHERE id = 95;
UPDATE departments SET parent_id = NULL WHERE id = 96;
UPDATE departments SET parent_id = NULL WHERE id = 97;
