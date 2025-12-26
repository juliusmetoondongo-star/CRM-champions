/*
  # Create notifications table

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `type` (text) - Type of notification (expiring_subscription, payment_due, etc.)
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `member_id` (uuid, foreign key) - Related member if applicable
      - `payload` (jsonb) - Additional data
      - `is_read` (boolean) - Read status
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on notifications table
    - Add policies for authenticated users to read and update notifications

  3. Indexes
    - Index on is_read for filtering unread notifications
    - Index on created_at for ordering
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  payload jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
