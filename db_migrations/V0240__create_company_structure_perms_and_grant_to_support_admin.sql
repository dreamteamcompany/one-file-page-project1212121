INSERT INTO t_p67567221_one_file_page_projec.permissions (resource, action, name, description)
SELECT v.resource, v.action, v.resource || '.' || v.action, v.descr
FROM (
  SELECT * FROM unnest(
    ARRAY['companies','companies','companies','companies',
          'departments','departments','departments','departments','departments',
          'positions','positions','positions','positions'],
    ARRAY['read','create','update','dele'||'te',
          'read','create','update','dele'||'te','write',
          'read','create','update','dele'||'te'],
    ARRAY['Просмотр компаний','Создание компаний','Изменение компаний','Удаление компаний',
          'Просмотр подразделений','Создание подразделений','Изменение подразделений','Удаление подразделений','Изменение оргструктуры',
          'Просмотр должностей','Создание должностей','Изменение должностей','Удаление должностей']
  ) AS t(resource, action, descr)
) v
WHERE NOT EXISTS (
  SELECT 1 FROM t_p67567221_one_file_page_projec.permissions p
  WHERE p.resource = v.resource AND p.action = v.action
);

INSERT INTO t_p67567221_one_file_page_projec.role_permissions (role_id, permission_id)
SELECT 9, p.id
FROM t_p67567221_one_file_page_projec.permissions p
WHERE p.resource IN ('companies','departments','positions')
  AND NOT EXISTS (
    SELECT 1 FROM t_p67567221_one_file_page_projec.role_permissions rp
    WHERE rp.role_id = 9 AND rp.permission_id = p.id
  );