-- Al Fakhir School LMS - Database Initialization
-- Run once on fresh PostgreSQL instance

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set timezone
SET timezone = 'Asia/Jakarta';

-- Create N8N database
CREATE DATABASE n8n
  WITH OWNER alfakhir
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8'
  TEMPLATE template0;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE alfakhir_school TO alfakhir;
GRANT ALL PRIVILEGES ON DATABASE n8n TO alfakhir;

-- Performance settings (applied at session level)
ALTER DATABASE alfakhir_school SET timezone TO 'Asia/Jakarta';
ALTER DATABASE alfakhir_school SET jit TO off;
