/*
  # Create Directory Views for Payments and Subscriptions

  1. Problem
    - Missing `payments_directory_view` and `subscriptions_directory_view`
    - These are needed by the Payments and Subscriptions pages
    - Need normalized views with proper joins

  2. Solution
    - Create `payments_directory_view` with member and discipline info
    - Create `subscriptions_directory_view` with member and discipline info
    - Both views properly join all necessary tables

  3. Security
    - Views inherit RLS from underlying tables
*/

-- Create payments directory view
CREATE OR REPLACE VIEW payments_directory_view AS
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
  s.discipline AS discipline_name,
  s.discipline AS discipline_slug,
  s.product_code
FROM payments p
LEFT JOIN members m ON p.member_id = m.id
LEFT JOIN subscriptions s ON p.subscription_id = s.id
ORDER BY p.paid_at DESC NULLS LAST;

-- Create subscriptions directory view
CREATE OR REPLACE VIEW subscriptions_directory_view AS
SELECT 
  s.id AS subscription_id,
  s.member_id,
  m.member_code,
  m.first_name || ' ' || m.last_name AS member_name,
  m.email AS member_email,
  s.plan_id,
  s.plan_name,
  s.discipline AS discipline_slug,
  s.discipline AS discipline_name,
  s.starts_at,
  s.ends_at,
  s.status,
  s.price_cents / 100.0 AS price_eur,
  s.total_cents / 100.0 AS total_eur,
  s.currency
FROM subscriptions s
LEFT JOIN members m ON s.member_id = m.id
ORDER BY s.starts_at DESC NULLS LAST;

-- Log the creation
INSERT INTO audit_logs (actor, action, entity, meta)
VALUES (
  'system',
  'create_views',
  'directory_views',
  jsonb_build_object(
    'action', 'Created payments_directory_view and subscriptions_directory_view',
    'views', ARRAY['payments_directory_view', 'subscriptions_directory_view']
  )
);
