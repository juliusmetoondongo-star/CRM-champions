/*
  # Add member_subscription_info table and missing columns

  1. New Tables
    - `member_subscription_info`
      - Aggregated view of member + subscription data
      - Links to members via member_code
      - Contains discipline, subscription type, validity dates, payment status

  2. Changes to existing tables
    - Add missing columns to members table:
      - card_uid (rename from rfid_uid for consistency)
      - address, birthdate, discipline, is_competitor, full_name
    - Add missing columns to payments table:
      - category (subscription, insurance, card, replacement)
      - memo/note field
    - Add discipline column to subscriptions table

  3. Security
    - Enable RLS on member_subscription_info
    - Add policies for authenticated users
*/

-- Add missing columns to members table
DO $$
BEGIN
  -- Add card_uid if it doesn't exist (alias for rfid_uid)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'members' AND column_name = 'card_uid') THEN
    ALTER TABLE members ADD COLUMN card_uid text UNIQUE;
    -- Copy existing rfid_uid data if present
    UPDATE members SET card_uid = rfid_uid WHERE rfid_uid IS NOT NULL;
  END IF;

  -- Add address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'members' AND column_name = 'address') THEN
    ALTER TABLE members ADD COLUMN address text;
  END IF;

  -- Add birthdate
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'members' AND column_name = 'birthdate') THEN
    ALTER TABLE members ADD COLUMN birthdate date;
  END IF;

  -- Add discipline
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'members' AND column_name = 'discipline') THEN
    ALTER TABLE members ADD COLUMN discipline text;
  END IF;

  -- Add is_competitor
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'members' AND column_name = 'is_competitor') THEN
    ALTER TABLE members ADD COLUMN is_competitor boolean DEFAULT false;
  END IF;

  -- Add full_name (computed)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'members' AND column_name = 'full_name') THEN
    ALTER TABLE members ADD COLUMN full_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
  END IF;
END $$;

-- Add discipline to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'discipline') THEN
    ALTER TABLE subscriptions ADD COLUMN discipline text;
  END IF;
END $$;

-- Add category and memo to payments table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payments' AND column_name = 'category') THEN
    ALTER TABLE payments ADD COLUMN category text DEFAULT 'subscription';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payments' AND column_name = 'memo') THEN
    ALTER TABLE payments ADD COLUMN memo text;
  END IF;
END $$;

-- Create member_subscription_info table
CREATE TABLE IF NOT EXISTS member_subscription_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text NOT NULL,
  full_name text NOT NULL,
  discipline text,
  abo_type text,
  valid_from date,
  valid_to date,
  is_active boolean DEFAULT false,
  member_status text DEFAULT 'unknown',
  amount_due numeric DEFAULT 0,
  payment_note text,
  card_uid text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Foreign key to members
  CONSTRAINT fk_msi_member_code
    FOREIGN KEY (member_code)
    REFERENCES members(member_code)
    ON DELETE CASCADE
);

-- Create index on member_code for performance
CREATE INDEX IF NOT EXISTS idx_msi_member_code ON member_subscription_info(member_code);
CREATE INDEX IF NOT EXISTS idx_msi_discipline ON member_subscription_info(discipline);
CREATE INDEX IF NOT EXISTS idx_msi_is_active ON member_subscription_info(is_active);
CREATE INDEX IF NOT EXISTS idx_msi_member_status ON member_subscription_info(member_status);

-- Enable RLS
ALTER TABLE member_subscription_info ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view member_subscription_info"
  ON member_subscription_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert member_subscription_info"
  ON member_subscription_info FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update member_subscription_info"
  ON member_subscription_info FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete member_subscription_info"
  ON member_subscription_info FOR DELETE
  TO authenticated
  USING (true);

-- Create function to automatically update member_status and is_active based on dates
CREATE OR REPLACE FUNCTION update_member_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_active based on dates
  IF NEW.valid_from IS NOT NULL AND NEW.valid_to IS NOT NULL THEN
    NEW.is_active := (CURRENT_DATE >= NEW.valid_from AND CURRENT_DATE <= NEW.valid_to);

    -- Update member_status
    IF NEW.is_active THEN
      NEW.member_status := 'active';
    ELSIF CURRENT_DATE > NEW.valid_to THEN
      NEW.member_status := 'expired';
    ELSE
      NEW.member_status := 'upcoming';
    END IF;
  ELSE
    NEW.is_active := false;
    NEW.member_status := 'unknown';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_member_subscription_status ON member_subscription_info;
CREATE TRIGGER trigger_update_member_subscription_status
  BEFORE INSERT OR UPDATE ON member_subscription_info
  FOR EACH ROW
  EXECUTE FUNCTION update_member_subscription_status();

-- Create function to sync subscription data from subscriptions table to member_subscription_info
CREATE OR REPLACE FUNCTION sync_subscription_to_info()
RETURNS TRIGGER AS $$
DECLARE
  v_member_code text;
  v_full_name text;
  v_discipline text;
  v_card_uid text;
BEGIN
  -- Get member details
  SELECT member_code, full_name, discipline, card_uid
  INTO v_member_code, v_full_name, v_discipline, v_card_uid
  FROM members
  WHERE id = NEW.member_id;

  -- Insert or update member_subscription_info
  INSERT INTO member_subscription_info (
    member_code,
    full_name,
    discipline,
    abo_type,
    valid_from,
    valid_to,
    card_uid
  ) VALUES (
    v_member_code,
    v_full_name,
    COALESCE(NEW.discipline, v_discipline),
    NEW.plan_name,
    NEW.starts_at::date,
    NEW.ends_at::date,
    v_card_uid
  )
  ON CONFLICT (member_code)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    discipline = EXCLUDED.discipline,
    abo_type = EXCLUDED.abo_type,
    valid_from = EXCLUDED.valid_from,
    valid_to = EXCLUDED.valid_to,
    card_uid = EXCLUDED.card_uid,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync subscriptions
DROP TRIGGER IF EXISTS trigger_sync_subscription ON subscriptions;
CREATE TRIGGER trigger_sync_subscription
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_info();

-- Add unique constraint on member_code in member_subscription_info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'member_subscription_info_member_code_key'
  ) THEN
    ALTER TABLE member_subscription_info
    ADD CONSTRAINT member_subscription_info_member_code_key
    UNIQUE (member_code);
  END IF;
END $$;
