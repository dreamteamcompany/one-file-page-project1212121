INSERT INTO t_p67567221_one_file_page_projec.permissions (name, description, resource, action)
VALUES (
    'tickets.use_templates',
    'Использование шаблонов ответов в заявке',
    'tickets',
    'use_templates'
)
ON CONFLICT (resource, action) DO NOTHING;