-- Starter users, dumped from the development database.
-- Apply after db/schema.sql with: psql -d docs_app_db -f db/seed.sql
-- Safe to re-run: usernames that already exist are left alone.

INSERT INTO users (username, display_name) VALUES
  ('user1', 'Bryan Giray'),
  ('user2', 'Bob Giray'),
  ('user3', 'Charlie Giray'),
  ('newuser', 'NewUser'),
  ('user2test', 'user2'),
  ('testuser', 'TestUser')
ON CONFLICT (username) DO NOTHING;
