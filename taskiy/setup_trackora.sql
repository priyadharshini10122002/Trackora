-- PostgreSQL setup script for Trackora
-- Run as: psql -U postgres -f setup_trackora.sql

-- Create database
CREATE DATABASE trackora;

-- Create user
CREATE USER priyadharshiniramachandran034 WITH PASSWORD 'taskiy034';

-- Configure user settings
ALTER ROLE priyadharshiniramachandran034 SET client_encoding TO 'utf8';
ALTER ROLE priyadharshiniramachandran034 SET default_transaction_isolation TO 'read committed';
ALTER ROLE priyadharshiniramachandran034 SET default_transaction_deferrable TO on;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE trackora TO priyadharshiniramachandran034;

-- Connect to trackora database
\c trackora;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO priyadharshiniramachandran034;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO priyadharshiniramachandran034;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO priyadharshiniramachandran034;
