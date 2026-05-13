ALTER TABLE bitrix_block_report_items
  ADD COLUMN IF NOT EXISTS email_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email_message TEXT;