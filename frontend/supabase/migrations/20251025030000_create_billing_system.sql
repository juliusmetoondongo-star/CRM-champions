/*
  # Create Billing System for Fees and Card Management

  1. New Functions
    - `pay_annual_insurance`: Record annual insurance payment (40€)
    - `issue_first_card`: Issue first card to member (20€)
    - `replace_card`: Replace member card with new UID (20€)

  2. New Views
    - `v_insurance_paid_this_year`: Track which members paid insurance for current year
    - `v_first_card_already_paid`: Track which members already paid for first card

  3. Changes
    - Adds meta column support for payment types (INSURANCE, CARD_ISSUE, CARD_REPLACEMENT)
    - Ensures proper audit logging for all fee operations
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS pay_annual_insurance(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS issue_first_card(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS replace_card(UUID, TEXT, TEXT, TEXT);

-- View: Check if member paid insurance for current year
DROP VIEW IF EXISTS v_insurance_paid_this_year;
CREATE VIEW v_insurance_paid_this_year AS
SELECT
  member_id,
  CAST((meta->>'year')::text AS INTEGER) as insurance_year,
  paid_at
FROM payments
WHERE
  meta->>'type' = 'INSURANCE'
  AND status = 'paid'
  AND CAST((meta->>'year')::text AS INTEGER) = EXTRACT(YEAR FROM NOW())::INTEGER;

-- View: Check if member already paid for first card
DROP VIEW IF EXISTS v_first_card_already_paid;
CREATE VIEW v_first_card_already_paid AS
SELECT DISTINCT
  member_id,
  paid_at
FROM payments
WHERE
  meta->>'type' = 'CARD_ISSUE'
  AND status = 'paid';

-- Function: Pay annual insurance
CREATE OR REPLACE FUNCTION pay_annual_insurance(
  p_member_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  p_method TEXT DEFAULT 'cash',
  p_status TEXT DEFAULT 'paid'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_member_name TEXT;
BEGIN
  -- Check if insurance already paid for this year
  IF EXISTS (
    SELECT 1 FROM payments
    WHERE member_id = p_member_id
      AND meta->>'type' = 'INSURANCE'
      AND CAST((meta->>'year')::text AS INTEGER) = p_year
      AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'Insurance already paid for year %', p_year;
  END IF;

  -- Get member name for audit
  SELECT first_name || ' ' || last_name INTO v_member_name
  FROM members WHERE id = p_member_id;

  -- Insert payment record (40€ = 4000 cents)
  INSERT INTO payments (
    member_id,
    amount_cents,
    currency,
    paid_at,
    method,
    status,
    meta
  ) VALUES (
    p_member_id,
    4000,
    'EUR',
    NOW(),
    p_method,
    p_status,
    jsonb_build_object('type', 'INSURANCE', 'year', p_year)
  ) RETURNING id INTO v_payment_id;

  -- Audit log
  INSERT INTO audit_logs (
    actor,
    action,
    entity,
    entity_id,
    meta
  ) VALUES (
    v_member_name,
    'pay_insurance',
    'payment',
    v_payment_id,
    jsonb_build_object('year', p_year, 'amount', 40)
  );

  RETURN v_payment_id::TEXT;
END;
$$;

-- Function: Issue first card
CREATE OR REPLACE FUNCTION issue_first_card(
  p_member_id UUID,
  p_card_uid TEXT,
  p_method TEXT DEFAULT 'cash',
  p_status TEXT DEFAULT 'paid'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_member_name TEXT;
BEGIN
  -- Check if first card already issued
  IF EXISTS (
    SELECT 1 FROM payments
    WHERE member_id = p_member_id
      AND meta->>'type' = 'CARD_ISSUE'
      AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'First card already issued for this member';
  END IF;

  -- Get member name for audit
  SELECT first_name || ' ' || last_name INTO v_member_name
  FROM members WHERE id = p_member_id;

  -- Update member's card_uid
  UPDATE members
  SET card_uid = UPPER(p_card_uid)
  WHERE id = p_member_id;

  -- Insert payment record (20€ = 2000 cents)
  INSERT INTO payments (
    member_id,
    amount_cents,
    currency,
    paid_at,
    method,
    status,
    meta
  ) VALUES (
    p_member_id,
    2000,
    'EUR',
    NOW(),
    p_method,
    p_status,
    jsonb_build_object('type', 'CARD_ISSUE', 'card_uid', UPPER(p_card_uid))
  ) RETURNING id INTO v_payment_id;

  -- Audit log
  INSERT INTO audit_logs (
    actor,
    action,
    entity,
    entity_id,
    meta
  ) VALUES (
    v_member_name,
    'issue_card',
    'payment',
    v_payment_id,
    jsonb_build_object('card_uid', UPPER(p_card_uid), 'amount', 20)
  );

  RETURN v_payment_id::TEXT;
END;
$$;

-- Function: Replace card
CREATE OR REPLACE FUNCTION replace_card(
  p_member_id UUID,
  p_new_card_uid TEXT,
  p_method TEXT DEFAULT 'cash',
  p_status TEXT DEFAULT 'paid'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_member_name TEXT;
  v_old_card_uid TEXT;
BEGIN
  -- Get member info
  SELECT first_name || ' ' || last_name, card_uid
  INTO v_member_name, v_old_card_uid
  FROM members WHERE id = p_member_id;

  -- Update member's card_uid
  UPDATE members
  SET card_uid = UPPER(p_new_card_uid)
  WHERE id = p_member_id;

  -- Insert payment record (20€ = 2000 cents)
  INSERT INTO payments (
    member_id,
    amount_cents,
    currency,
    paid_at,
    method,
    status,
    meta
  ) VALUES (
    p_member_id,
    2000,
    'EUR',
    NOW(),
    p_method,
    p_status,
    jsonb_build_object(
      'type', 'CARD_REPLACEMENT',
      'old_card_uid', v_old_card_uid,
      'new_card_uid', UPPER(p_new_card_uid)
    )
  ) RETURNING id INTO v_payment_id;

  -- Audit log
  INSERT INTO audit_logs (
    actor,
    action,
    entity,
    entity_id,
    meta
  ) VALUES (
    v_member_name,
    'replace_card',
    'payment',
    v_payment_id,
    jsonb_build_object(
      'old_card_uid', v_old_card_uid,
      'new_card_uid', UPPER(p_new_card_uid),
      'amount', 20
    )
  );

  RETURN v_payment_id::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION pay_annual_insurance TO authenticated;
GRANT EXECUTE ON FUNCTION issue_first_card TO authenticated;
GRANT EXECUTE ON FUNCTION replace_card TO authenticated;

-- Grant select on views
GRANT SELECT ON v_insurance_paid_this_year TO authenticated;
GRANT SELECT ON v_first_card_already_paid TO authenticated;
