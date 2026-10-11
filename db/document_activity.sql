-- Log of who created, viewed, edited and renamed each document.
-- Apply with: psql -d docs_app_db -f db/document_activity.sql
CREATE TABLE IF NOT EXISTS document_activity (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS document_activity_document_idx
  ON document_activity (document_id, id);
