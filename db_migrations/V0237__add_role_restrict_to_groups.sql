ALTER TABLE t_p67567221_one_file_page_projec.roles
    ADD COLUMN IF NOT EXISTS restrict_to_groups boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.role_visible_groups (
    role_id integer NOT NULL REFERENCES t_p67567221_one_file_page_projec.roles(id),
    group_id integer NOT NULL REFERENCES t_p67567221_one_file_page_projec.executor_groups(id),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_role_visible_groups_role ON t_p67567221_one_file_page_projec.role_visible_groups(role_id);