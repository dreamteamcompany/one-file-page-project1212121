-- Таблица для отслеживания прочтения отдельных комментариев заявок
-- Используется для галочек доставки/прочтения (одна серая / две серых / две синих)

CREATE TABLE IF NOT EXISTS ticket_comment_reads (
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_comment_reads_user
    ON ticket_comment_reads (user_id, comment_id);

CREATE INDEX IF NOT EXISTS idx_ticket_comment_reads_comment
    ON ticket_comment_reads (comment_id);

COMMENT ON TABLE ticket_comment_reads IS
    'Прочтение отдельных комментариев заявок. Автор комментария считается прочитавшим автоматически (без записи).';
