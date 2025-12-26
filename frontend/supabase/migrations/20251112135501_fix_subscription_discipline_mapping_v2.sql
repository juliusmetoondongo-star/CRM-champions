/*
  # Fix Subscription Discipline Mapping

  1. Problem
    - Discipline filter doesn't work correctly on subscriptions page
    - Need to extract discipline from plan_name, not use the discipline column
    - Plan names follow pattern: "Discipline Name - Period"
    
  2. Solution
    - Create a function to map plan names to discipline slugs
    - Recreate subscriptions_directory_view to use proper discipline mapping
    - Map based on the catalog structure

  3. Discipline Mapping (from catalog.ts)
    - "Boxe Anglaise" → boxe
    - "Boxe Thaïlandaise" → muay-thai
    - "MMA" → mma
    - "Jiu-Jitsu Brésilien Adultes" → bjj
    - "Boxe Thaïlandaise - LADIES ONLY" → femmes-muay-thai
    - "Jiu-Jitsu Brésilien - LADIES ONLY" → femmes-bjj
    - "Jiu-Jitsu Brésilien / Kick-Boxing - ENFANTS" → kids
*/

-- Function to extract discipline slug from plan name
CREATE OR REPLACE FUNCTION get_discipline_from_plan(plan_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Match plan name patterns to discipline slugs
  IF plan_name ILIKE 'Boxe Anglaise%' THEN
    RETURN 'boxe';
  ELSIF plan_name ILIKE 'Boxe Thaïlandaise - LADIES ONLY%' OR plan_name ILIKE '%LADIES ONLY%Thaï%' THEN
    RETURN 'femmes-muay-thai';
  ELSIF plan_name ILIKE 'Boxe Thaïlandaise%' OR plan_name ILIKE 'Boxe Thai%' THEN
    RETURN 'muay-thai';
  ELSIF plan_name ILIKE 'Jiu-Jitsu Brésilien - LADIES ONLY%' OR plan_name ILIKE '%LADIES ONLY%Jiu%' THEN
    RETURN 'femmes-bjj';
  ELSIF plan_name ILIKE 'Jiu-Jitsu Brésilien Adultes%' THEN
    RETURN 'bjj';
  ELSIF plan_name ILIKE 'Jiu-Jitsu Brésilien / Kick-Boxing - ENFANTS%' OR plan_name ILIKE '%ENFANTS%' THEN
    RETURN 'kids';
  ELSIF plan_name ILIKE 'MMA%' THEN
    RETURN 'mma';
  ELSE
    -- Fallback: try to match common keywords
    IF plan_name ILIKE '%bjj%' OR plan_name ILIKE '%jiu%jitsu%' THEN
      RETURN 'bjj';
    ELSIF plan_name ILIKE '%thai%' OR plan_name ILIKE '%muay%' THEN
      RETURN 'muay-thai';
    ELSIF plan_name ILIKE '%boxe%' THEN
      RETURN 'boxe';
    ELSIF plan_name ILIKE '%mma%' THEN
      RETURN 'mma';
    ELSE
      RETURN NULL;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get discipline display name from slug
CREATE OR REPLACE FUNCTION get_discipline_name_from_slug(slug TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE slug
    WHEN 'boxe' THEN RETURN 'Boxe Anglaise';
    WHEN 'muay-thai' THEN RETURN 'Boxe Thaïlandaise';
    WHEN 'mma' THEN RETURN 'MMA';
    WHEN 'bjj' THEN RETURN 'Jiu-Jitsu Brésilien Adultes';
    WHEN 'femmes-muay-thai' THEN RETURN 'Boxe Thaïlandaise - LADIES ONLY';
    WHEN 'femmes-bjj' THEN RETURN 'Jiu-Jitsu Brésilien - LADIES ONLY';
    WHEN 'kids' THEN RETURN 'Jiu-Jitsu Brésilien / Kick-Boxing - ENFANTS';
    ELSE RETURN slug;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop and recreate subscriptions_directory_view
DROP VIEW IF EXISTS subscriptions_directory_view CASCADE;

CREATE VIEW subscriptions_directory_view AS
SELECT 
  s.id AS subscription_id,
  s.member_id,
  m.member_code,
  m.first_name || ' ' || m.last_name AS member_name,
  m.email AS member_email,
  s.plan_id,
  s.plan_name,
  get_discipline_from_plan(s.plan_name) AS discipline_slug,
  get_discipline_name_from_slug(get_discipline_from_plan(s.plan_name)) AS discipline_name,
  s.starts_at,
  s.ends_at,
  s.status,
  s.price_cents / 100.0 AS price_eur,
  s.total_cents / 100.0 AS total_eur,
  s.currency
FROM subscriptions s
LEFT JOIN members m ON s.member_id = m.id
ORDER BY s.starts_at DESC NULLS LAST;

-- Drop and recreate payments_directory_view
DROP VIEW IF EXISTS payments_directory_view CASCADE;

CREATE VIEW payments_directory_view AS
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
  get_discipline_from_plan(s.plan_name) AS discipline_slug,
  get_discipline_name_from_slug(get_discipline_from_plan(s.plan_name)) AS discipline_name,
  s.product_code
FROM payments p
LEFT JOIN members m ON p.member_id = m.id
LEFT JOIN subscriptions s ON p.subscription_id = s.id
ORDER BY p.paid_at DESC NULLS LAST;

-- Log the fix
INSERT INTO audit_logs (actor, action, entity, meta)
VALUES (
  'system',
  'fix_discipline_mapping',
  'views',
  jsonb_build_object(
    'action', 'Fixed discipline mapping in subscriptions and payments views',
    'method', 'Extract discipline from plan_name using pattern matching',
    'functions_created', ARRAY['get_discipline_from_plan', 'get_discipline_name_from_slug']
  )
);
