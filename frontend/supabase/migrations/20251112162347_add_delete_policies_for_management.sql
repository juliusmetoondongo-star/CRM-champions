/*
  # Add DELETE policies for management tables

  1. New Policies
    - Allow authenticated users to delete members
    - Allow authenticated users to delete subscriptions
    - Allow authenticated users to delete payments
    - Allow authenticated users to delete receipts (related to payments)

  2. Security
    - All policies restricted to authenticated users only
    - Enables proper data management from admin interface
*/

-- Members DELETE policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "members_delete_authenticated" ON members;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "members_delete_authenticated"
  ON members
  FOR DELETE
  TO authenticated
  USING (true);

-- Subscriptions DELETE policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "subscriptions_delete_authenticated" ON subscriptions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "subscriptions_delete_authenticated"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (true);

-- Payments DELETE policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "payments_delete_authenticated" ON payments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "payments_delete_authenticated"
  ON payments
  FOR DELETE
  TO authenticated
  USING (true);

-- Receipts DELETE policy (related to payments)
DO $$ BEGIN
  DROP POLICY IF EXISTS "receipts_delete_authenticated" ON receipts;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "receipts_delete_authenticated"
  ON receipts
  FOR DELETE
  TO authenticated
  USING (true);