/*
  # Create member directory view for efficient member listing

  1. New View
    - `v_member_directory`
      - Combines members and member_subscription_info
      - Optimized for the members page listing with 5000+ members
      - Includes all necessary fields for display

  2. Purpose
    - Provides fast access to member data with subscription info
    - Handles 5000+ members efficiently
    - Pre-joins data to avoid N+1 queries
*/

CREATE OR REPLACE VIEW v_member_directory AS
SELECT 
  m.id,
  m.member_code,
  m.first_name,
  m.last_name,
  m.full_name,
  m.email,
  m.phone,
  m.status,
  m.card_uid,
  m.last_scan_at,
  m.created_at,
  m.updated_at,
  msi.discipline,
  msi.member_status,
  msi.is_active,
  msi.abo_type,
  msi.valid_from,
  msi.valid_to,
  msi.amount_due
FROM members m
LEFT JOIN member_subscription_info msi ON m.member_code = msi.member_code
ORDER BY m.member_code;

-- Grant access to authenticated users
GRANT SELECT ON v_member_directory TO authenticated;
