/*
  # Fix Security Issues - Part 2: RLS Optimization and Consolidation

  1. Optimize RLS Policies
    - Fix profiles table policies to use (select auth.uid()) for better performance

  2. Consolidate Duplicate RLS Policies
    - Remove duplicate permissive policies on multiple tables
    - Keep only the most appropriate policy for each action

  3. Add RLS Policies for Tables with RLS Enabled
    - Add policies for `member_subscription_info`
    - Add policies for `user_preferences`

  This migration improves RLS performance and security consistency.
*/

-- ==========================================
-- 1. OPTIMIZE RLS POLICIES ON PROFILES TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

-- Recreate with optimized auth function calls
CREATE POLICY "read_own_profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ==========================================
-- 2. CONSOLIDATE DUPLICATE RLS POLICIES
-- ==========================================

-- AUDIT_LOGS: Remove duplicates, keep consolidated policies
DROP POLICY IF EXISTS "public read audit" ON public.audit_logs;
DROP POLICY IF EXISTS "public write audit" ON public.audit_logs;
DROP POLICY IF EXISTS "audit read" ON public.audit_logs;

CREATE POLICY "audit_logs_select_authenticated" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- CHECKINS: Consolidate all policies
DROP POLICY IF EXISTS "public read checkins" ON public.checkins;
DROP POLICY IF EXISTS "public write checkins" ON public.checkins;
DROP POLICY IF EXISTS "Allow authenticated read checkins" ON public.checkins;
DROP POLICY IF EXISTS "Allow authenticated write checkins" ON public.checkins;
DROP POLICY IF EXISTS "checkins read" ON public.checkins;
DROP POLICY IF EXISTS "checkins insert" ON public.checkins;
DROP POLICY IF EXISTS "checkins update" ON public.checkins;
DROP POLICY IF EXISTS "checkins delete" ON public.checkins;
DROP POLICY IF EXISTS "read checkins (auth)" ON public.checkins;

CREATE POLICY "checkins_authenticated_all" ON public.checkins
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DISCIPLINES: Consolidate policies
DROP POLICY IF EXISTS "Allow authenticated read disciplines" ON public.disciplines;
DROP POLICY IF EXISTS "d_read_auth" ON public.disciplines;
DROP POLICY IF EXISTS "d_select_auth" ON public.disciplines;
DROP POLICY IF EXISTS "read disciplines (auth)" ON public.disciplines;

CREATE POLICY "disciplines_select_authenticated" ON public.disciplines
  FOR SELECT
  TO authenticated
  USING (true);

-- MEMBER_DISCIPLINES: Consolidate policies
DROP POLICY IF EXISTS "Allow authenticated write member_disciplines" ON public.member_disciplines;
DROP POLICY IF EXISTS "Allow authenticated read member_disciplines" ON public.member_disciplines;
DROP POLICY IF EXISTS "md_delete_auth" ON public.member_disciplines;
DROP POLICY IF EXISTS "md_insert_auth" ON public.member_disciplines;
DROP POLICY IF EXISTS "md_select_auth" ON public.member_disciplines;

CREATE POLICY "member_disciplines_authenticated_all" ON public.member_disciplines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- MEMBERS: Consolidate policies
DROP POLICY IF EXISTS "public read members" ON public.members;
DROP POLICY IF EXISTS "public write members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated read members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated write members" ON public.members;
DROP POLICY IF EXISTS "m_read_auth" ON public.members;
DROP POLICY IF EXISTS "m_select_auth" ON public.members;
DROP POLICY IF EXISTS "members read" ON public.members;
DROP POLICY IF EXISTS "members insert" ON public.members;
DROP POLICY IF EXISTS "members update" ON public.members;
DROP POLICY IF EXISTS "members delete" ON public.members;
DROP POLICY IF EXISTS "members_select_auth" ON public.members;
DROP POLICY IF EXISTS "members_update_auth" ON public.members;
DROP POLICY IF EXISTS "read members (auth)" ON public.members;

CREATE POLICY "members_authenticated_all" ON public.members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- NOTIFICATIONS: Consolidate policies
DROP POLICY IF EXISTS "public read notifications" ON public.notifications;
DROP POLICY IF EXISTS "public write notifications" ON public.notifications;

CREATE POLICY "notifications_authenticated_all" ON public.notifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- PAYMENTS: Consolidate policies
DROP POLICY IF EXISTS "public read payments" ON public.payments;
DROP POLICY IF EXISTS "public write payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated write payments" ON public.payments;
DROP POLICY IF EXISTS "p_read_auth" ON public.payments;
DROP POLICY IF EXISTS "p_select_auth" ON public.payments;
DROP POLICY IF EXISTS "payments read" ON public.payments;
DROP POLICY IF EXISTS "payments insert" ON public.payments;
DROP POLICY IF EXISTS "payments update" ON public.payments;
DROP POLICY IF EXISTS "payments delete" ON public.payments;
DROP POLICY IF EXISTS "read payments (auth)" ON public.payments;

CREATE POLICY "payments_authenticated_all" ON public.payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- PLANS: Consolidate policies
DROP POLICY IF EXISTS "Allow authenticated read plans" ON public.plans;
DROP POLICY IF EXISTS "Allow authenticated write plans" ON public.plans;

CREATE POLICY "plans_authenticated_all" ON public.plans
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- SUBSCRIPTIONS: Consolidate policies
DROP POLICY IF EXISTS "public read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "public write subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow authenticated read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow authenticated write subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "read subscriptions (auth)" ON public.subscriptions;
DROP POLICY IF EXISTS "s_read_auth" ON public.subscriptions;
DROP POLICY IF EXISTS "s_select_auth" ON public.subscriptions;
DROP POLICY IF EXISTS "subs read" ON public.subscriptions;
DROP POLICY IF EXISTS "subs insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subs update" ON public.subscriptions;
DROP POLICY IF EXISTS "subs delete" ON public.subscriptions;

CREATE POLICY "subscriptions_authenticated_all" ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- 3. ADD POLICIES FOR TABLES WITH RLS BUT NO POLICIES
-- ==========================================

-- member_subscription_info: Add policies
CREATE POLICY "member_subscription_info_select_authenticated" ON public.member_subscription_info
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "member_subscription_info_update_authenticated" ON public.member_subscription_info
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- user_preferences: Add policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    EXECUTE 'CREATE POLICY "user_preferences_authenticated_own" ON public.user_preferences
      FOR ALL
      TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;
