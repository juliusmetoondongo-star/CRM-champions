/*
  # Post-import constraints and validation

  Run this migration AFTER importing the CSV file:
  1. Sync members from member_subscription_info
  2. Add foreign key constraint
  3. Update all statuses based on dates
  4. Create validation views
*/

-- Step 1: Sync members from subscription info
SELECT sync_members_from_subscription_info();

-- Step 2: Add foreign key constraint (now that members exist)
ALTER TABLE public.member_subscription_info
DROP CONSTRAINT IF EXISTS fk_member_subscription_info_member_code;

ALTER TABLE public.member_subscription_info
ADD CONSTRAINT fk_member_subscription_info_member_code
FOREIGN KEY (member_code)
REFERENCES public.members(member_code)
ON DELETE CASCADE;

-- Step 3: Force update of all statuses based on current dates
UPDATE member_subscription_info
SET updated_at = now()
WHERE true;

-- Step 4: Create a view for dashboard KPIs
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM member_subscription_info WHERE is_active = true) as active_members,
  (SELECT COUNT(*) FROM checkins WHERE scanned_at::date = CURRENT_DATE) as checkins_today,
  (SELECT COALESCE(SUM(amount_cents), 0) / 100.0 FROM payments
   WHERE status = 'completed'
   AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE)) as revenue_month,
  (SELECT COALESCE(SUM(amount_due), 0) FROM member_subscription_info WHERE amount_due > 0) as amount_due,
  (SELECT COUNT(*) FROM member_subscription_info WHERE amount_due > 0) as members_with_debt;

-- Step 5: Create a view for active members by discipline
CREATE OR REPLACE VIEW v_active_members_by_discipline AS
SELECT
  discipline,
  COUNT(*) as member_count
FROM member_subscription_info
WHERE is_active = true
GROUP BY discipline
ORDER BY member_count DESC;

-- Step 6: Create a view for subscription status summary
CREATE OR REPLACE VIEW v_subscription_status_summary AS
SELECT
  member_status,
  COUNT(*) as count
FROM member_subscription_info
GROUP BY member_status
ORDER BY count DESC;

-- Step 7: Grant access to views
GRANT SELECT ON v_dashboard_kpis TO authenticated;
GRANT SELECT ON v_active_members_by_discipline TO authenticated;
GRANT SELECT ON v_subscription_status_summary TO authenticated;

-- Step 8: Validation queries
DO $$
DECLARE
  v_total_rows bigint;
  v_active_count bigint;
  v_total_due numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_rows FROM member_subscription_info;
  SELECT COUNT(*) INTO v_active_count FROM member_subscription_info WHERE is_active = true;
  SELECT COALESCE(SUM(amount_due), 0) INTO v_total_due FROM member_subscription_info WHERE amount_due > 0;

  RAISE NOTICE 'Total rows in member_subscription_info: %', v_total_rows;
  RAISE NOTICE 'Active members: %', v_active_count;
  RAISE NOTICE 'Total amount due: € %', v_total_due;

  IF v_total_rows = 0 THEN
    RAISE WARNING 'No data found in member_subscription_info. CSV import may have failed.';
  END IF;
END $$;
