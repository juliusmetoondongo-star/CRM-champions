/*
  # ClubManager CRM - Database Schema

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `member_code` (text, unique) - Unique member identifier
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `rfid_uid` (text, unique) - RFID card unique identifier
      - `status` (text) - active/inactive/suspended
      - `last_scan_at` (timestamptz) - Last check-in time
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `subscriptions`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key)
      - `plan_name` (text) - Subscription plan name
      - `starts_at` (timestamptz)
      - `ends_at` (timestamptz)
      - `status` (text) - active/expired/suspended
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payments`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key)
      - `subscription_id` (uuid, foreign key)
      - `amount_cents` (integer) - Amount in cents
      - `currency` (text) - EUR, USD, etc.
      - `paid_at` (timestamptz)
      - `method` (text) - cash/card/transfer/online
      - `status` (text) - pending/completed/failed/refunded
      - `created_at` (timestamptz)
    
    - `checkins`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key)
      - `scanned_at` (timestamptz)
      - `source` (text) - rfid/manual/mobile
      - `location` (text) - Gym location
      - `created_at` (timestamptz)
    
    - `audit_logs`
      - `id` (uuid, primary key)
      - `actor` (text) - User who performed action
      - `action` (text) - Action type
      - `entity` (text) - Entity affected
      - `entity_id` (uuid)
      - `meta` (jsonb) - Additional metadata
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write data
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  rfid_uid text UNIQUE,
  status text NOT NULL DEFAULT 'active',
  last_scan_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  paid_at timestamptz DEFAULT now(),
  method text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Create checkins table
CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'rfid',
  location text NOT NULL DEFAULT 'Ixelles',
  created_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete subscriptions"
  ON subscriptions FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view checkins"
  ON checkins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert checkins"
  ON checkins FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update checkins"
  ON checkins FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete checkins"
  ON checkins FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_rfid ON members(rfid_uid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_member ON checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_scanned ON checkins(scanned_at DESC);

-- Update trigger for members
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();