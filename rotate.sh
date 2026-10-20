#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

NEW_PASSWORD="app-$(openssl rand -hex 16)"


echo "1. Changing the PostgreSQL role password..."

docker compose exec -T db \
  psql -U app_user -d marketplace \
  -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE app_user WITH PASSWORD '${NEW_PASSWORD}';" \
  >/dev/null


echo "2. Updating the password file..."

printf '%s' "${NEW_PASSWORD}" > secrets/db_password

echo "3. Closing old app_user connections..."

docker compose exec -T db \
  psql -U app_user -d marketplace \
  -v ON_ERROR_STOP=1 \
  -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE usename = 'app_user'
      AND pid <> pg_backend_pid();
  " \
  >/dev/null

echo "Password rotation completed without restarting the API."