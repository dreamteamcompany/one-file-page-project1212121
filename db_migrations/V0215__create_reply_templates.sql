CREATE TABLE IF NOT EXISTS t_p67567221_one_file_page_projec.reply_templates (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES t_p67567221_one_file_page_projec.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reply_templates_created_by ON t_p67567221_one_file_page_projec.reply_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_reply_templates_is_shared ON t_p67567221_one_file_page_projec.reply_templates(is_shared);
