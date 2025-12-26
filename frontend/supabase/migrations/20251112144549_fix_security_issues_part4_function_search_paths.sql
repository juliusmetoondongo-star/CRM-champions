/*
  # Fix Security Issues - Part 4: Fix Function Search Paths

  1. Set Immutable Search Paths
    - Set search_path to a fixed value for all functions to prevent search path injection attacks
    - Use 'public, pg_temp' as the standard search path

  This migration enhances security by preventing search path manipulation attacks.
*/

-- ==========================================
-- FIX FUNCTION SEARCH PATHS
-- ==========================================

-- Public schema functions
ALTER FUNCTION public.before_insert_receipt() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.app_role() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.revenue_12_months() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.set_updated_at() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.initialize_subscriptions() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.send_email_after_receipt_trigger() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.get_discipline_from_plan(text) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.refresh_member_status() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.replace_card(uuid, text, text, text) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.send_receipt_email(bigint) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.issue_first_card(uuid, text, text, text) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.stage_receipt_email() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.apply_second_subscription_discount() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.get_receipt_email_payload(bigint) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.get_discipline_name_from_slug(text) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.pay_annual_insurance(uuid, integer, text, text) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.checkins_30_days_local() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.update_member_last_scan() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.create_member_subscription(uuid, text, text, date) SET search_path = 'public, pg_temp';
ALTER FUNCTION public.requesting_user_is_admin() SET search_path = 'public, pg_temp';

-- App schema functions
ALTER FUNCTION app.trg_payments_notify() SET search_path = 'public, pg_temp';
ALTER FUNCTION app.event_dispatcher_url() SET search_path = 'public, pg_temp';
ALTER FUNCTION app.dispatch_event(text, uuid, jsonb) SET search_path = 'public, pg_temp';
ALTER FUNCTION app.trg_checkins_notify() SET search_path = 'public, pg_temp';
ALTER FUNCTION app._post_event_dispatcher(jsonb) SET search_path = 'public, pg_temp';
ALTER FUNCTION app.queue_sender_url() SET search_path = 'public, pg_temp';
ALTER FUNCTION app.trg_subscriptions_notify() SET search_path = 'public, pg_temp';
