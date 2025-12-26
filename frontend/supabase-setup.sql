-- ============================================================================
-- CHAMPION'S ACADEMY CRM - SUPABASE SETUP SCRIPT
-- ============================================================================
-- Ce script configure l'infrastructure complète Supabase:
-- - Tables avec RLS activé
-- - Indexes de performance
-- - Vues optimisées pour le frontend
-- - Fonctions RPC sécurisées
-- - Triggers automatiques
-- - Politiques d'accès
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLEANUP & PREPARATION
-- ============================================================================

-- Drop existing views if they exist (in reverse dependency order)
DROP VIEW IF EXISTS kpi_bundle CASCADE;
DROP VIEW IF EXISTS active_members_by_discipline CASCADE;
DROP VIEW IF EXISTS members_directory_view CASCADE;
DROP VIEW IF EXISTS v_member_status CASCADE;
DROP VIEW IF EXISTS revenue_per_month CASCADE;

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

-- Ensure core tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.disciplines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discipline_name text,
  category text DEFAULT 'adults',
  billing_period text DEFAULT 'monthly',
  price_cents integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text UNIQUE,
  card_uid text,
  rfid_uid text,
  first_name text,
  last_name text,
  email text,
  phone text,
  birthdate date,
  address text,
  status text DEFAULT 'active',
  is_competitor boolean DEFAULT false,
  notes text,
  last_scan_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_disciplines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  discipline_id uuid REFERENCES public.disciplines(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, discipline_id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  plan_name text,
  price_cents integer,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'EUR',
  method text,
  category text,
  status text DEFAULT 'completed',
  paid_at timestamptz DEFAULT now(),
  memo text,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  scanned_at timestamptz DEFAULT now(),
  location text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SECTION 3: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4: RLS POLICIES (Allow authenticated users full access)
-- ============================================================================

-- Disciplines
DROP POLICY IF EXISTS "Allow authenticated read disciplines" ON public.disciplines;
CREATE POLICY "Allow authenticated read disciplines" ON public.disciplines
  FOR SELECT TO authenticated USING (true);

-- Plans
DROP POLICY IF EXISTS "Allow authenticated read plans" ON public.plans;
CREATE POLICY "Allow authenticated read plans" ON public.plans
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write plans" ON public.plans;
CREATE POLICY "Allow authenticated write plans" ON public.plans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Members
DROP POLICY IF EXISTS "Allow authenticated read members" ON public.members;
CREATE POLICY "Allow authenticated read members" ON public.members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write members" ON public.members;
CREATE POLICY "Allow authenticated write members" ON public.members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Member Disciplines
DROP POLICY IF EXISTS "Allow authenticated read member_disciplines" ON public.member_disciplines;
CREATE POLICY "Allow authenticated read member_disciplines" ON public.member_disciplines
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write member_disciplines" ON public.member_disciplines;
CREATE POLICY "Allow authenticated write member_disciplines" ON public.member_disciplines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Subscriptions
DROP POLICY IF EXISTS "Allow authenticated read subscriptions" ON public.subscriptions;
CREATE POLICY "Allow authenticated read subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write subscriptions" ON public.subscriptions;
CREATE POLICY "Allow authenticated write subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payments
DROP POLICY IF EXISTS "Allow authenticated read payments" ON public.payments;
CREATE POLICY "Allow authenticated read payments" ON public.payments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write payments" ON public.payments;
CREATE POLICY "Allow authenticated write payments" ON public.payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Checkins
DROP POLICY IF EXISTS "Allow authenticated read checkins" ON public.checkins;
CREATE POLICY "Allow authenticated read checkins" ON public.checkins
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write checkins" ON public.checkins;
CREATE POLICY "Allow authenticated write checkins" ON public.checkins
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- SECTION 5: PERFORMANCE INDEXES
-- ============================================================================

-- Members
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_card_uid ON public.members(card_uid);
CREATE INDEX IF NOT EXISTS idx_members_member_code ON public.members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_last_scan_at ON public.members(last_scan_at);

-- Member Disciplines
CREATE INDEX IF NOT EXISTS idx_member_disciplines_member_id ON public.member_disciplines(member_id);
CREATE INDEX IF NOT EXISTS idx_member_disciplines_discipline_id ON public.member_disciplines(discipline_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON public.subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON public.subscriptions(starts_at, ends_at);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

-- Checkins
CREATE INDEX IF NOT EXISTS idx_checkins_member_id ON public.checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_scanned_at ON public.checkins(scanned_at);

-- ============================================================================
-- SECTION 6: OPTIMIZED VIEWS
-- ============================================================================

-- View: members_directory_view
-- Complete member information with disciplines for directory listing
CREATE OR REPLACE VIEW public.members_directory_view AS
SELECT
  m.id,
  m.member_code,
  m.first_name,
  m.last_name,
  m.email,
  m.phone,
  m.status,
  m.last_scan_at AS last_seen_at,
  COALESCE(
    array_agg(DISTINCT d.slug) FILTER (WHERE d.slug IS NOT NULL),
    ARRAY[]::text[]
  ) AS discipline_slugs,
  COALESCE(
    array_agg(DISTINCT d.name) FILTER (WHERE d.name IS NOT NULL),
    ARRAY[]::text[]
  ) AS discipline_names,
  m.created_at,
  m.updated_at
FROM public.members m
LEFT JOIN public.member_disciplines md ON m.id = md.member_id
LEFT JOIN public.disciplines d ON md.discipline_id = d.id
GROUP BY m.id, m.member_code, m.first_name, m.last_name, m.email, m.phone, m.status, m.last_scan_at, m.created_at, m.updated_at;

-- View: v_member_status
-- Computed status for each member based on active subscriptions
CREATE OR REPLACE VIEW public.v_member_status AS
SELECT
  m.id AS member_id,
  m.status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.member_id = m.id
        AND s.status = 'active'
        AND s.starts_at <= now()
        AND s.ends_at >= now()
    ) THEN 'active'
    WHEN m.status = 'suspended' THEN 'suspended'
    ELSE 'inactive'
  END AS computed_status
FROM public.members m;

-- View: active_members_by_discipline
-- Count of active members per discipline
CREATE OR REPLACE VIEW public.active_members_by_discipline AS
SELECT
  d.id AS discipline_id,
  d.name AS discipline_name,
  d.slug AS discipline,
  COUNT(DISTINCT m.id) AS member_count
FROM public.disciplines d
LEFT JOIN public.member_disciplines md ON d.id = md.discipline_id
LEFT JOIN public.members m ON md.member_id = m.id
WHERE m.status = 'active'
GROUP BY d.id, d.name, d.slug
ORDER BY member_count DESC;

-- View: revenue_per_month
-- Monthly revenue aggregation
CREATE OR REPLACE VIEW public.revenue_per_month AS
SELECT
  TO_CHAR(DATE_TRUNC('month', p.paid_at), 'YYYY-MM') AS month,
  SUM(p.amount_cents) / 100.0 AS revenue
FROM public.payments p
WHERE p.status = 'completed'
  AND p.paid_at IS NOT NULL
GROUP BY DATE_TRUNC('month', p.paid_at)
ORDER BY month DESC;

-- View: kpi_bundle
-- Dashboard KPIs in a single query
CREATE OR REPLACE VIEW public.kpi_bundle AS
SELECT
  (SELECT COUNT(*) FROM public.members WHERE status = 'active') AS active_members,
  (SELECT COALESCE(SUM(amount_cents) / 100.0, 0)
   FROM public.payments
   WHERE status = 'completed'
     AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE)
  ) AS revenue_mtd,
  (SELECT COALESCE(SUM(amount_cents) / 100.0, 0)
   FROM public.payments
   WHERE status IN ('pending', 'due')
  ) AS remaining_due,
  (SELECT COUNT(DISTINCT member_id)
   FROM public.payments
   WHERE status IN ('pending', 'due')
  ) AS nb_in_arrears,
  (SELECT COUNT(*)
   FROM public.checkins
   WHERE DATE(scanned_at) = CURRENT_DATE
  ) AS today_checkins;

-- ============================================================================
-- SECTION 7: HELPER FUNCTIONS (RPC)
-- ============================================================================

-- Function: initialize_subscriptions
-- Creates initial subscriptions for all members without active subscriptions
CREATE OR REPLACE FUNCTION public.initialize_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_member RECORD;
  v_plan_name text;
  v_price integer;
BEGIN
  FOR v_member IN
    SELECT id, first_name, last_name
    FROM public.members
    WHERE NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.member_id = members.id
        AND s.status = 'active'
        AND s.ends_at >= CURRENT_DATE
    )
  LOOP
    -- Assign a default plan
    v_plan_name := 'Abonnement Mensuel';
    v_price := 5000; -- 50 EUR

    INSERT INTO public.subscriptions (
      member_id,
      plan_name,
      price_cents,
      starts_at,
      ends_at,
      status
    ) VALUES (
      v_member.id,
      v_plan_name,
      v_price,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 month',
      'active'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function: refresh_member_status
-- Updates member status based on subscription status
CREATE OR REPLACE FUNCTION public.refresh_member_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.members m
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.member_id = m.id
        AND s.status = 'active'
        AND s.starts_at <= now()
        AND s.ends_at >= now()
    ) THEN 'active'
    ELSE 'inactive'
  END
  WHERE m.status != 'suspended';
END;
$$;

-- ============================================================================
-- SECTION 8: AUTOMATIC TRIGGERS
-- ============================================================================

-- Trigger: Update member last_scan_at on checkin
CREATE OR REPLACE FUNCTION public.update_member_last_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.members
  SET last_scan_at = NEW.scanned_at
  WHERE id = NEW.member_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_member_last_scan ON public.checkins;
CREATE TRIGGER trigger_update_member_last_scan
  AFTER INSERT ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_member_last_scan();

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_members_updated_at ON public.members;
CREATE TRIGGER trigger_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant access to views
GRANT SELECT ON public.members_directory_view TO authenticated;
GRANT SELECT ON public.v_member_status TO authenticated;
GRANT SELECT ON public.active_members_by_discipline TO authenticated;
GRANT SELECT ON public.revenue_per_month TO authenticated;
GRANT SELECT ON public.kpi_bundle TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.initialize_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_member_status() TO authenticated;

-- ============================================================================
-- SECTION 10: SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample disciplines if table is empty
INSERT INTO public.disciplines (slug, name)
VALUES
  ('boxe-thai', 'Boxe Thaï'),
  ('boxe-anglaise', 'Boxe Anglaise'),
  ('muay-thai', 'Muay Thai'),
  ('kick-boxing', 'Kick Boxing')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample plans if table is empty
INSERT INTO public.plans (name, discipline_name, category, billing_period, price_cents, is_active)
VALUES
  ('Abonnement Mensuel', 'Boxe Thaï', 'adults', 'monthly', 5000, true),
  ('Abonnement Trimestriel', 'Boxe Thaï', 'adults', 'quarterly', 13500, true),
  ('Abonnement Ladies', 'Ladies Fitness', 'ladies', 'monthly', 4500, true),
  ('Abonnement Kids', 'Kids Boxing', 'kids', 'monthly', 3500, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VALIDATION QUERIES (Run these to verify setup)
-- ============================================================================

-- Check tables exist
SELECT 'Tables created' AS status, COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('disciplines', 'plans', 'members', 'member_disciplines', 'subscriptions', 'payments', 'checkins');

-- Check views exist
SELECT 'Views created' AS status, COUNT(*) AS count
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('members_directory_view', 'v_member_status', 'active_members_by_discipline', 'revenue_per_month', 'kpi_bundle');

-- Check RLS is enabled
SELECT 'RLS enabled' AS status, COUNT(*) AS count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('disciplines', 'plans', 'members', 'member_disciplines', 'subscriptions', 'payments', 'checkins')
  AND rowsecurity = true;

-- Check indexes exist
SELECT 'Indexes created' AS status, COUNT(*) AS count
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- Test KPI view
SELECT * FROM public.kpi_bundle;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Execute: SELECT public.initialize_subscriptions();
-- to create initial subscriptions for existing members
-- ============================================================================
