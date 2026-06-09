CREATE UNIQUE INDEX IF NOT EXISTS uq_user_assignment_no_service
    ON t_p67567221_one_file_page_projec.executor_user_service_mappings (user_id, ticket_service_id)
    WHERE service_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_assignment_no_service
    ON t_p67567221_one_file_page_projec.executor_group_service_mappings (group_id, ticket_service_id)
    WHERE service_id IS NULL;