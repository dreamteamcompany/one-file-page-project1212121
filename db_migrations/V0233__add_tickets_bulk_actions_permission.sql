INSERT INTO t_p67567221_one_file_page_projec.permissions (name, description, resource, action)
VALUES (
    'tickets.bulk_actions',
    'Массовые действия со заявками',
    'tickets',
    'bulk_actions'
)
ON CONFLICT (resource, action) DO NOTHING;