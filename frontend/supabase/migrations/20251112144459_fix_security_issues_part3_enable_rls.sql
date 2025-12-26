/*
  # Fix Security Issues - Part 3: Enable RLS on Public Tables

  1. Enable RLS
    - Enable RLS on all public tables that don't have it
    - Add appropriate policies for each table

  2. Security Notes
    - All tables now require authentication to access
    - Admin functions may need service_role key to bypass RLS

  This migration ensures all public tables are protected by RLS.
*/

-- ==========================================
-- ENABLE RLS ON PUBLIC TABLES
-- ==========================================

-- products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_authenticated" ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_modify_authenticated" ON public.products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_logs_authenticated_all" ON public.email_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedules_authenticated_all" ON public.payment_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- email_outbox
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_outbox_authenticated_all" ON public.email_outbox
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_authenticated_all" ON public.channels
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- secrets (admin only)
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secrets_service_role_only" ON public.secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- automations
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_authenticated_all" ON public.automations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_authenticated_all" ON public.receipts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- org_settings
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_settings_select_authenticated" ON public.org_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "org_settings_modify_service_role" ON public.org_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- discipline_schedules
ALTER TABLE public.discipline_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discipline_schedules_authenticated_all" ON public.discipline_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
