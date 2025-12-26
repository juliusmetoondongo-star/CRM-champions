/*
  # Fix Security Issues - Part 5: Move Extensions from Public Schema

  1. Move Extensions
    - Move btree_gist extension from public to extensions schema
    - Move pg_net extension from public to extensions schema

  2. Security Notes
    - Extensions in public schema can pose security risks
    - Moving to dedicated schema improves security isolation

  This migration improves security by isolating extensions from public schema.
*/

-- ==========================================
-- MOVE EXTENSIONS FROM PUBLIC SCHEMA
-- ==========================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move btree_gist extension
DO $$
BEGIN
  -- Drop and recreate in extensions schema
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'btree_gist'
  ) THEN
    DROP EXTENSION IF EXISTS btree_gist CASCADE;
    CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;
  END IF;
END $$;

-- Move pg_net extension
DO $$
BEGIN
  -- Drop and recreate in extensions schema
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    DROP EXTENSION IF EXISTS pg_net CASCADE;
    CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
  END IF;
END $$;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
