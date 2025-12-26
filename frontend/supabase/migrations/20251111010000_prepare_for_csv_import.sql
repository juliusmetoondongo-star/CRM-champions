/*
  # Prepare database for CSV import from Users_with_badge1.csv

  1. Clean existing data (keep members, payments, checkins)
  2. Ensure member_subscription_info table structure is correct
  3. Add proper constraints and indexes
  4. Verify triggers are in place

  IMPORTANT: Run this BEFORE importing the CSV file via Supabase Dashboard
*/

-- Step 1: Clean existing data
DELETE FROM public.member_subscription_info;
DELETE FROM public.subscriptions;

-- Step 2: Ensure table structure is correct
-- Drop and recreate member_subscription_info with correct types
DROP TABLE IF EXISTS public.member_subscription_info CASCADE;

CREATE TABLE public.member_subscription_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text NOT NULL UNIQUE,
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
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_msi_member_code ON member_subscription_info(member_code);
CREATE INDEX IF NOT EXISTS idx_msi_discipline ON member_subscription_info(discipline);
CREATE INDEX IF NOT EXISTS idx_msi_is_active ON member_subscription_info(is_active);
CREATE INDEX IF NOT EXISTS idx_msi_member_status ON member_subscription_info(member_status);
CREATE INDEX IF NOT EXISTS idx_msi_card_uid ON member_subscription_info(card_uid);
CREATE INDEX IF NOT EXISTS idx_msi_valid_to ON member_subscription_info(valid_to);

-- Step 4: Enable RLS
ALTER TABLE member_subscription_info ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS "Authenticated users can view member_subscription_info" ON member_subscription_info;
CREATE POLICY "Authenticated users can view member_subscription_info"
  ON member_subscription_info FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert member_subscription_info" ON member_subscription_info;
CREATE POLICY "Authenticated users can insert member_subscription_info"
  ON member_subscription_info FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update member_subscription_info" ON member_subscription_info;
CREATE POLICY "Authenticated users can update member_subscription_info"
  ON member_subscription_info FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete member_subscription_info" ON member_subscription_info;
CREATE POLICY "Authenticated users can delete member_subscription_info"
  ON member_subscription_info FOR DELETE
  TO authenticated
  USING (true);

-- Step 6: Create function to automatically update status based on dates
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
    ELSIF CURRENT_DATE < NEW.valid_from THEN
      NEW.member_status := 'upcoming';
    ELSE
      NEW.member_status := 'inactive';
    END IF;
  ELSE
    NEW.is_active := false;
    NEW.member_status := 'unknown';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS trigger_update_member_subscription_status ON member_subscription_info;
CREATE TRIGGER trigger_update_member_subscription_status
  BEFORE INSERT OR UPDATE ON member_subscription_info
  FOR EACH ROW
  EXECUTE FUNCTION update_member_subscription_status();

-- Step 8: Add foreign key (will be added AFTER importing CSV and ensuring members exist)
-- This is commented out because it will be added in the next migration
-- ALTER TABLE public.member_subscription_info
-- ADD CONSTRAINT fk_member_subscription_info_member_code
-- FOREIGN KEY (member_code)
-- REFERENCES public.members(member_code)
-- ON DELETE CASCADE;

-- Step 9: Create helper function to sync members from member_subscription_info
CREATE OR REPLACE FUNCTION sync_members_from_subscription_info()
RETURNS void AS $$
DECLARE
  v_row RECORD;
BEGIN
  -- For each row in member_subscription_info, ensure a member exists
  FOR v_row IN SELECT DISTINCT ON (member_code)
    member_code,
    full_name,
    discipline,
    card_uid
  FROM member_subscription_info
  LOOP
    -- Split full_name into first_name and last_name
    INSERT INTO members (
      member_code,
      first_name,
      last_name,
      email,
      card_uid,
      discipline,
      status
    ) VALUES (
      v_row.member_code,
      SPLIT_PART(v_row.full_name, ' ', 1),
      CASE
        WHEN POSITION(' ' IN v_row.full_name) > 0
        THEN SUBSTRING(v_row.full_name FROM POSITION(' ' IN v_row.full_name) + 1)
        ELSE ''
      END,
      LOWER(v_row.member_code) || '@championsacademy.be',
      v_row.card_uid,
      v_row.discipline,
      'active'
    )
    ON CONFLICT (member_code) DO UPDATE SET
      card_uid = EXCLUDED.card_uid,
      discipline = EXCLUDED.discipline,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Validation queries (run these AFTER importing CSV)
-- SELECT COUNT(*) AS total_rows FROM member_subscription_info;
-- SELECT discipline, COUNT(*) FROM member_subscription_info GROUP BY discipline ORDER BY COUNT(*) DESC;
-- SELECT COUNT(*) AS actifs FROM member_subscription_info WHERE is_active = true;
-- SELECT SUM(amount_due) AS total_due, COUNT(*) AS membres_en_retard FROM member_subscription_info WHERE amount_due > 0;
