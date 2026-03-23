ALTER TABLE ticket_statuses ADD COLUMN count_for_distribution boolean NOT NULL DEFAULT false;

ALTER TABLE executor_groups ADD COLUMN balance_mode character varying(20) NOT NULL DEFAULT 'none';

COMMENT ON COLUMN ticket_statuses.count_for_distribution IS 'Whether tickets in this status are counted when distributing by workload';
COMMENT ON COLUMN executor_groups.balance_mode IS 'Distribution balance mode: none (equal without workload), balanced (with current workload consideration)';