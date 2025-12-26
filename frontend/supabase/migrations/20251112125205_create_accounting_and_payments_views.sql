/*
  # Create Accounting and Payments Views

  1. Problem
    - The `accounting_journal` view doesn't exist, causing Accounting page to fail
    - Need a comprehensive view for accounting with all payment details
    - Need to ensure proper RLS for accounting data

  2. Solution
    - Create `accounting_journal` view with all payment info including member, subscription, discipline
    - Ensure the view properly joins all necessary tables
    - Keep existing views intact

  3. Security
    - View inherits RLS from underlying tables
    - No direct RLS needed on views
*/

-- Create accounting journal view for comprehensive payment tracking
CREATE OR REPLACE VIEW accounting_journal AS
SELECT 
  p.id AS payment_id,
  p.paid_at,
  p.amount_cents / 100.0 AS amount_eur,
  p.currency,
  p.method,
  p.status,
  p.note AS memo,
  p.subscription_id,
  p.member_id,
  m.first_name || ' ' || m.last_name AS member_name,
  m.email AS member_email,
  m.member_code,
  s.plan_name,
  s.discipline,
  s.product_code
FROM payments p
LEFT JOIN members m ON p.member_id = m.id
LEFT JOIN subscriptions s ON p.subscription_id = s.id
WHERE p.status = 'paid' AND p.paid_at IS NOT NULL
ORDER BY p.paid_at DESC;

-- Log the creation
INSERT INTO audit_logs (actor, action, entity, meta)
VALUES (
  'system',
  'create_view',
  'accounting_journal',
  jsonb_build_object(
    'action', 'Created accounting_journal view for comprehensive payment tracking',
    'tables_used', ARRAY['payments', 'members', 'subscriptions']
  )
);
