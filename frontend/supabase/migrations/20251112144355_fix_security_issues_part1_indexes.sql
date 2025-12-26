/*
  # Fix Security Issues - Part 1: Indexes and Primary Keys

  1. Add Missing Indexes on Foreign Keys
    - Add index on `delivery_logs.message_id`
    - Add index on `email_outbox.receipt_id`
    - Add index on `member_subscription_info.member_code`

  2. Add Primary Key
    - Add primary key to `member_subscription_info` table using member_code

  3. Remove Duplicate Indexes
    - Drop duplicate indexes on `member_disciplines`, `payments`, and `subscriptions`
    - Keep only the newer _id suffixed versions

  4. Remove Unused Indexes
    - Drop unused indexes that are not being utilized by queries

  This migration improves query performance and database efficiency.
*/

-- ==========================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ==========================================

-- Index for delivery_logs.message_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'delivery_logs' 
    AND indexname = 'idx_delivery_logs_message_id'
  ) THEN
    CREATE INDEX idx_delivery_logs_message_id ON public.delivery_logs(message_id);
  END IF;
END $$;

-- Index for email_outbox.receipt_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'email_outbox' 
    AND indexname = 'idx_email_outbox_receipt_id'
  ) THEN
    CREATE INDEX idx_email_outbox_receipt_id ON public.email_outbox(receipt_id);
  END IF;
END $$;

-- Index for member_subscription_info.member_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'member_subscription_info' 
    AND indexname = 'idx_member_subscription_info_member_code'
  ) THEN
    CREATE INDEX idx_member_subscription_info_member_code ON public.member_subscription_info(member_code);
  END IF;
END $$;

-- ==========================================
-- 2. ADD PRIMARY KEY TO member_subscription_info
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'member_subscription_info_pkey'
    AND conrelid = 'public.member_subscription_info'::regclass
  ) THEN
    -- Set NOT NULL constraint
    ALTER TABLE public.member_subscription_info 
    ALTER COLUMN member_code SET NOT NULL;
    
    -- Add primary key
    ALTER TABLE public.member_subscription_info 
    ADD CONSTRAINT member_subscription_info_pkey PRIMARY KEY (member_code);
  END IF;
END $$;

-- ==========================================
-- 3. REMOVE DUPLICATE INDEXES
-- ==========================================

-- Drop duplicate indexes on member_disciplines (keep _id versions)
DROP INDEX IF EXISTS public.idx_member_disciplines_discipline;
DROP INDEX IF EXISTS public.idx_member_disciplines_member;

-- Drop duplicate indexes on payments (keep _id versions)
DROP INDEX IF EXISTS public.idx_payments_member;
DROP INDEX IF EXISTS public.idx_payments_subscription;

-- Drop duplicate indexes on subscriptions (keep _id version)
DROP INDEX IF EXISTS public.idx_subscriptions_member;

-- ==========================================
-- 4. REMOVE UNUSED INDEXES
-- ==========================================

DROP INDEX IF EXISTS public.idx_subscriptions_member_product;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_payments_meta_gin;
DROP INDEX IF EXISTS public.idx_payments_category_time;
DROP INDEX IF EXISTS public.idx_payments_method_time;
DROP INDEX IF EXISTS public.idx_payment_schedules_status;
DROP INDEX IF EXISTS public.idx_payment_schedules_due;
DROP INDEX IF EXISTS public.idx_payments_subscription_id;
DROP INDEX IF EXISTS public.idx_outbound_next_attempt;
DROP INDEX IF EXISTS public.idx_receipts_created_at;
DROP INDEX IF EXISTS public.idx_members_email;
DROP INDEX IF EXISTS public.idx_member_disciplines_discipline_id;
