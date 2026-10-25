#!/bin/sh
# Creates the synthetic admin user from TEST_EMAIL and TEST_PASSWORD, hashed
# with bcrypt (pgcrypto's "bf") so the app's bcrypt.compare accepts it.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v email="$TEST_EMAIL" -v password="$TEST_PASSWORD" <<'SQL'
INSERT INTO users (name, email, password)
VALUES ('Test user', :'email', crypt(:'password', gen_salt('bf', 10)));
SQL
