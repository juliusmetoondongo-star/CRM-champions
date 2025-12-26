/*
  Validation queries for Champion's Academy CRM
  Run these queries after CSV import to verify data integrity
*/

-- ==================== DATA VALIDATION ====================

-- 1. Total rows imported
SELECT 'Total rows in member_subscription_info' as check_name,
       COUNT(*) as value
FROM member_subscription_info;

-- 2. Distribution by discipline
SELECT 'Distribution by discipline' as check_name;
SELECT discipline, COUNT(*) as count, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM member_subscription_info
GROUP BY discipline
ORDER BY count DESC;

-- 3. Active members count
SELECT 'Active members' as check_name,
       COUNT(*) as value
FROM member_subscription_info
WHERE is_active = true;

-- 4. Members by status
SELECT 'Distribution by status' as check_name;
SELECT member_status, COUNT(*) as count
FROM member_subscription_info
GROUP BY member_status
ORDER BY count DESC;

-- 5. Amount due summary
SELECT 'Amount due summary' as check_name;
SELECT
  COUNT(*) as members_with_debt,
  ROUND(SUM(amount_due)::numeric, 2) as total_due,
  ROUND(AVG(amount_due)::numeric, 2) as avg_due,
  ROUND(MIN(amount_due)::numeric, 2) as min_due,
  ROUND(MAX(amount_due)::numeric, 2) as max_due
FROM member_subscription_info
WHERE amount_due > 0;

-- 6. Subscription validity
SELECT 'Subscription validity dates' as check_name;
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE valid_from IS NOT NULL) as has_valid_from,
  COUNT(*) FILTER (WHERE valid_to IS NOT NULL) as has_valid_to,
  COUNT(*) FILTER (WHERE valid_from IS NOT NULL AND valid_to IS NOT NULL) as has_both_dates,
  COUNT(*) FILTER (WHERE valid_to >= CURRENT_DATE) as not_expired_yet,
  COUNT(*) FILTER (WHERE valid_to < CURRENT_DATE) as expired
FROM member_subscription_info;

-- 7. RFID card distribution
SELECT 'RFID card distribution' as check_name;
SELECT
  COUNT(*) as total_members,
  COUNT(card_uid) as has_card_uid,
  COUNT(*) - COUNT(card_uid) as missing_card_uid,
  ROUND((COUNT(card_uid) * 100.0 / COUNT(*))::numeric, 2) as percentage_with_card
FROM member_subscription_info;

-- 8. Verify members table sync
SELECT 'Members table sync' as check_name;
SELECT
  (SELECT COUNT(*) FROM member_subscription_info) as in_subscription_info,
  (SELECT COUNT(*) FROM members) as in_members_table,
  (SELECT COUNT(*) FROM members m
   WHERE EXISTS (SELECT 1 FROM member_subscription_info msi WHERE msi.member_code = m.member_code)) as synced;

-- 9. Check for duplicate member_codes
SELECT 'Duplicate member_codes check' as check_name;
SELECT member_code, COUNT(*) as count
FROM member_subscription_info
GROUP BY member_code
HAVING COUNT(*) > 1;

-- 10. Verify foreign key integrity
SELECT 'Foreign key integrity' as check_name;
SELECT
  COUNT(*) as total_in_msi,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM members WHERE members.member_code = member_subscription_info.member_code
  )) as has_matching_member,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM members WHERE members.member_code = member_subscription_info.member_code
  )) as orphaned_records
FROM member_subscription_info;

-- ==================== DASHBOARD VALIDATION ====================

-- 11. Dashboard KPIs (should match v_dashboard_kpis view)
SELECT 'Dashboard KPIs verification' as check_name;
SELECT
  (SELECT COUNT(*) FROM member_subscription_info WHERE is_active = true) as active_members,
  (SELECT COUNT(*) FROM checkins WHERE scanned_at::date = CURRENT_DATE) as checkins_today,
  (SELECT COALESCE(ROUND(SUM(amount_cents) / 100.0, 2), 0) FROM payments
   WHERE status = 'completed'
   AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE)) as revenue_month_eur,
  (SELECT COALESCE(ROUND(SUM(amount_due)::numeric, 2), 0) FROM member_subscription_info WHERE amount_due > 0) as amount_due_eur,
  (SELECT COUNT(*) FROM member_subscription_info WHERE amount_due > 0) as members_with_debt;

-- 12. Compare with view (if exists)
SELECT 'Dashboard KPIs from view' as check_name;
SELECT * FROM v_dashboard_kpis;

-- 13. Active members by discipline (for pie chart)
SELECT 'Active members by discipline (pie chart data)' as check_name;
SELECT * FROM v_active_members_by_discipline;

-- ==================== DATA QUALITY CHECKS ====================

-- 14. Check for NULL or empty critical fields
SELECT 'Data quality - critical fields' as check_name;
SELECT
  COUNT(*) FILTER (WHERE member_code IS NULL OR member_code = '') as missing_member_code,
  COUNT(*) FILTER (WHERE full_name IS NULL OR full_name = '') as missing_full_name,
  COUNT(*) FILTER (WHERE discipline IS NULL OR discipline = '') as missing_discipline,
  COUNT(*) FILTER (WHERE valid_from IS NULL) as missing_valid_from,
  COUNT(*) FILTER (WHERE valid_to IS NULL) as missing_valid_to
FROM member_subscription_info;

-- 15. Check for suspicious dates
SELECT 'Data quality - date validation' as check_name;
SELECT
  COUNT(*) FILTER (WHERE valid_from > valid_to) as invalid_date_range,
  COUNT(*) FILTER (WHERE valid_from > CURRENT_DATE + INTERVAL '1 year') as future_start_date,
  COUNT(*) FILTER (WHERE valid_to < '2020-01-01') as very_old_end_date,
  COUNT(*) FILTER (WHERE valid_to > CURRENT_DATE + INTERVAL '2 years') as very_future_end_date
FROM member_subscription_info;

-- 16. Check for suspicious amount_due values
SELECT 'Data quality - amount_due validation' as check_name;
SELECT
  COUNT(*) FILTER (WHERE amount_due < 0) as negative_amounts,
  COUNT(*) FILTER (WHERE amount_due > 10000) as very_high_amounts,
  COUNT(*) FILTER (WHERE amount_due IS NULL) as null_amounts
FROM member_subscription_info;

-- ==================== SAMPLE DATA ====================

-- 17. Sample active members
SELECT 'Sample active members (first 5)' as check_name;
SELECT
  member_code,
  full_name,
  discipline,
  abo_type,
  valid_from,
  valid_to,
  is_active,
  member_status,
  amount_due,
  card_uid
FROM member_subscription_info
WHERE is_active = true
ORDER BY valid_to DESC
LIMIT 5;

-- 18. Sample expired members
SELECT 'Sample expired members (first 5)' as check_name;
SELECT
  member_code,
  full_name,
  discipline,
  valid_from,
  valid_to,
  member_status,
  amount_due
FROM member_subscription_info
WHERE member_status = 'expired'
ORDER BY valid_to DESC
LIMIT 5;

-- 19. Members with debt
SELECT 'Members with debt (first 5)' as check_name;
SELECT
  member_code,
  full_name,
  discipline,
  abo_type,
  valid_to,
  ROUND(amount_due::numeric, 2) as amount_due,
  payment_note
FROM member_subscription_info
WHERE amount_due > 0
ORDER BY amount_due DESC
LIMIT 5;

-- ==================== SUMMARY ====================

-- 20. Overall summary
SELECT '=== OVERALL SUMMARY ===' as summary;
SELECT
  'member_subscription_info' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_records,
  COUNT(*) FILTER (WHERE amount_due > 0) as records_with_debt,
  ROUND(AVG(amount_due)::numeric, 2) as avg_amount_due
FROM member_subscription_info

UNION ALL

SELECT
  'members' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE status = 'active') as active_records,
  NULL as records_with_debt,
  NULL as avg_amount_due
FROM members

UNION ALL

SELECT
  'checkins' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE scanned_at::date = CURRENT_DATE) as today_records,
  NULL as records_with_debt,
  NULL as avg_amount_due
FROM checkins

UNION ALL

SELECT
  'payments' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_records,
  NULL as records_with_debt,
  ROUND(AVG(amount_cents) / 100.0, 2) as avg_amount_eur
FROM payments;
