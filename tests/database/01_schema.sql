-- Schema for the disposable test database, matching the production tables
-- described in src/seed.md. Postgres runs the files in this folder in order
-- when the container in docker-compose.test.yml starts with an empty volume.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

CREATE TABLE chopin_liszt (
  chopin_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chopin_text VARCHAR(255) NOT NULL,
  checked BOOLEAN NOT NULL
);

CREATE TABLE whisky_journal (
  last_edited TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  whisky_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  distillery VARCHAR(255) NOT NULL,
  country_region VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  grain VARCHAR(255) NOT NULL,
  abv DECIMAL(5,1) NOT NULL,
  rating INT NOT NULL,
  price INT NOT NULL,
  notes TEXT NOT NULL
);

CREATE TABLE film_list (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  release_year VARCHAR(4) NOT NULL,
  top_30 BOOLEAN NOT NULL,
  watched BOOLEAN NOT NULL,
  not_in_jar BOOLEAN NOT NULL
);
