/*
  # Fix audit_logs INSERT policy

  1. Changes
    - Add INSERT policy for audit_logs to allow authenticated users to insert audit records
    - This is needed for triggers that create audit logs when subscriptions are created

  2. Security
    - Policy restricted to authenticated users only
    - Allows system triggers to create audit log entries
*/

-- Drop existing policies if they exist with the same purpose
DO $$ BEGIN
  DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON audit_logs;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create INSERT policy for audit_logs
CREATE POLICY "audit_logs_insert_authenticated"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);