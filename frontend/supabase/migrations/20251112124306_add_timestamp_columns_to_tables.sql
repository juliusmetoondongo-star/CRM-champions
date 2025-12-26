/*
  # Add Timestamp Columns to Tables

  1. Problem
    - Table `payments` missing `created_at` and `updated_at` columns
    - Table `subscriptions` missing `created_at` and `updated_at` columns
    - This causes errors when inserting/updating records

  2. Solution
    - Add `created_at` with default NOW() to both tables
    - Add `updated_at` with default NOW() to both tables
    - Add trigger to auto-update `updated_at` on UPDATE

  3. Security
    - No RLS changes needed
*/

-- Add timestamp columns to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add timestamp columns to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for payments.updated_at
DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for subscriptions.updated_at
DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Log the fix
INSERT INTO audit_logs (actor, action, entity, meta)
VALUES (
  'system',
  'add_timestamps',
  'tables',
  jsonb_build_object(
    'action', 'Added created_at and updated_at columns to payments and subscriptions',
    'tables', ARRAY['payments', 'subscriptions']
  )
);
