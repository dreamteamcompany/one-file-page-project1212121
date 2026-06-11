INSERT INTO t_p67567221_one_file_page_projec.permissions (name, description, resource, action)
VALUES (
    'tickets.forbid_change_executor',
    'Запретить менять исполнителя в заявке',
    'tickets',
    'forbid_change_executor'
)
ON CONFLICT (resource, action) DO NOTHING;