INSERT INTO t_p67567221_one_file_page_projec.permissions (name, description, resource, action)
VALUES (
    'tickets.edit_approvers',
    'Редактирование согласующих заявки',
    'tickets',
    'edit_approvers'
)
ON CONFLICT (resource, action) DO NOTHING;