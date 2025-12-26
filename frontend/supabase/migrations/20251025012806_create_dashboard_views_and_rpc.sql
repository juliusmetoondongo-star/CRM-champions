/*
  # Dashboard Views and RPC Functions

  1. Views & Functions Created
    - `daily_checkins_30d` - RPC function returning daily check-ins for last 30 days
    - `subscription_status_counts` - RPC function returning counts by subscription status
    - `revenue_12_months` - RPC function returning monthly revenue for last 12 months

  2. Purpose
    - Provide aggregated data for dashboard charts
    - Optimize query performance with indexed views
    - Format data for direct consumption by frontend charts
*/

-- RPC: Daily check-ins for last 30 days
CREATE OR REPLACE FUNCTION daily_checkins_30d()
RETURNS TABLE (
  day_label text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(day::date, 'DD') as day_label,
    COUNT(c.id)::bigint as count
  FROM generate_series(
    CURRENT_DATE - INTERVAL '29 days',
    CURRENT_DATE,
    '1 day'::interval
  ) day
  LEFT JOIN checkins c ON DATE(c.scanned_at) = day::date
  GROUP BY day
  ORDER BY day;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Subscription status counts
CREATE OR REPLACE FUNCTION subscription_status_counts()
RETURNS TABLE (
  status_key text,
  status_label text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.status as status_key,
    CASE
      WHEN s.status = 'active' THEN 'Actif'
      WHEN s.status = 'expired' THEN 'Expiré'
      WHEN s.status = 'suspended' THEN 'Suspendu'
      ELSE 'Autre'
    END as status_label,
    COUNT(*)::bigint as count
  FROM subscriptions s
  GROUP BY s.status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Revenue for last 12 months
CREATE OR REPLACE FUNCTION revenue_12_months()
RETURNS TABLE (
  month_label text,
  amount_eur numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(month::date, 'Mon') as month_label,
    COALESCE(SUM(p.amount_cents)::numeric / 100, 0) as amount_eur
  FROM generate_series(
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
    DATE_TRUNC('month', CURRENT_DATE),
    '1 month'::interval
  ) month
  LEFT JOIN payments p
    ON DATE_TRUNC('month', p.paid_at) = month
    AND p.status = 'completed'
  GROUP BY month
  ORDER BY month;
END;
$$ LANGUAGE plpgsql STABLE;