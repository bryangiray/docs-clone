#!/usr/bin/env bash
# Runs on the server, from the project root, after the new code is checked
# out (see .github/workflows/ci-cd.yml). Safe to run by hand as well.
set -eo pipefail

# SSH commands don't load the login profile, so pick up nvm's Node if present.
if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi
set -u

if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi
: "${DATABASE_URL:=postgres://localhost:5432/docs_app_db}"

npm ci

# Adds tables that are missing; existing tables and data are left alone.
PGOPTIONS="--client-min-messages=warning" \
  psql "$DATABASE_URL" --quiet --set ON_ERROR_STOP=1 --file db/schema.sql

# A new database gets the starter users; one that has users is left alone.
if [ "$(psql "$DATABASE_URL" --tuples-only --no-align --command 'SELECT count(*) FROM users')" = "0" ]; then
  psql "$DATABASE_URL" --quiet --set ON_ERROR_STOP=1 --file db/seed.sql
fi

npm run build

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
