/*
  # Disable Automatic Receipt Creation Trigger

  1. Problem
    - Trigger `trg_create_receipt_after_payment` automatically creates receipts for ALL payments
    - This causes errors when creating simple payments (not all payments need receipts)
    - The trigger references `pl.discipline_id` indirectly through receipt creation logic

  2. Solution
    - Drop the trigger that auto-creates receipts
    - Drop the function that was used by the trigger
    - Receipts can be created manually when needed

  3. Security
    - No RLS changes needed
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS trg_create_receipt_after_payment ON payments;

-- Drop the function
DROP FUNCTION IF EXISTS create_receipt_after_payment();

-- Drop the receipt number generator function as well (no longer needed)
DROP FUNCTION IF EXISTS gen_receipt_number();

-- Log the fix
INSERT INTO audit_logs (actor, action, entity, meta)
VALUES (
  'system',
  'disable_trigger',
  'payments',
  jsonb_build_object(
    'action', 'Disabled automatic receipt creation trigger',
    'reason', 'Not all payments require receipts; trigger was causing errors',
    'trigger_name', 'trg_create_receipt_after_payment'
  )
);
