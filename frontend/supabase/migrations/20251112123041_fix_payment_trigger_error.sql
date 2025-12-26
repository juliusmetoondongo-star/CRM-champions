/*
  # Fix Payment Trigger Error

  1. Problem
    - The trigger `fn_payments_after_insert` tries to insert into `receipts` table
    - It references columns that don't exist: member_id, payment_id, total_cents
    - This causes "column pl.discipline_id does not exist" error (misleading error message)

  2. Solution
    - Drop the problematic trigger and function
    - Receipts will be handled differently in the application

  3. Security
    - No RLS changes needed
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS trg_payments_after_insert ON payments;

-- Drop the function
DROP FUNCTION IF EXISTS fn_payments_after_insert();

-- Log the fix
INSERT INTO audit_logs (actor, action, entity, meta)
VALUES (
  'system',
  'fix_trigger',
  'payments',
  jsonb_build_object(
    'action', 'Removed broken trigger fn_payments_after_insert',
    'reason', 'Trigger referenced non-existent columns in receipts table'
  )
);
