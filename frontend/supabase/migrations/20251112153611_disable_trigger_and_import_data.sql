/*
  # Désactiver temporairement le trigger et importer les données

  1. Désactiver le trigger problématique
  2. Import des membres depuis member_subscription_info
  3. Liaison membre-disciplines
  4. Import des abonnements
  5. Import des paiements
  6. Réactiver le trigger
*/

-- 1. Désactiver le trigger temporairement
ALTER TABLE subscriptions DISABLE TRIGGER trg_second_sub_discount;

-- 2. Import des membres
INSERT INTO members (member_code, first_name, last_name, card_uid, status, created_at, updated_at)
SELECT DISTINCT
  member_code,
  CASE 
    WHEN POSITION(' ' IN full_name) > 0 
    THEN SUBSTRING(full_name FROM 1 FOR POSITION(' ' IN full_name) - 1)
    ELSE full_name
  END as first_name,
  CASE 
    WHEN POSITION(' ' IN full_name) > 0 
    THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE ''
  END as last_name,
  card_uid,
  CASE 
    WHEN is_active = true THEN 'active'::text
    ELSE 'inactive'::text
  END as status,
  COALESCE(valid_from::timestamp, NOW()) as created_at,
  NOW() as updated_at
FROM member_subscription_info
WHERE member_code IS NOT NULL
ON CONFLICT (member_code) DO UPDATE SET
  card_uid = EXCLUDED.card_uid,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 3. Liaison membre-disciplines  
INSERT INTO member_disciplines (member_id, discipline_id, created_at)
SELECT DISTINCT
  m.id as member_id,
  d.id as discipline_id,
  NOW() as created_at
FROM member_subscription_info msi
JOIN members m ON m.member_code = msi.member_code
JOIN disciplines d ON (
  (LOWER(TRIM(msi.discipline)) = 'boxe anglaise' AND d.slug = 'boxe-anglaise') OR
  (LOWER(TRIM(msi.discipline)) LIKE 'boxe thai%' AND d.slug = 'boxe-thai') OR
  (LOWER(TRIM(msi.discipline)) = 'kick boxing' AND d.slug = 'kick-boxing') OR
  (LOWER(TRIM(msi.discipline)) = 'muay thai' AND d.slug = 'muay-thai') OR
  (LOWER(TRIM(msi.discipline)) = 'mma' AND d.slug = 'mma')
)
WHERE msi.discipline IS NOT NULL
ON CONFLICT (member_id, discipline_id) DO NOTHING;

-- 4. Import des abonnements
INSERT INTO subscriptions (member_id, plan_name, price_cents, starts_at, ends_at, status, created_at, updated_at)
SELECT
  m.id as member_id,
  COALESCE(NULLIF(TRIM(msi.abo_type), ''), 'Plan Standard') as plan_name,
  2000 as price_cents,
  COALESCE(msi.valid_from::date, CURRENT_DATE - interval '1 year') as starts_at,
  COALESCE(msi.valid_to::date, CURRENT_DATE - interval '11 months') as ends_at,
  'expired'::text as status,
  COALESCE(msi.valid_from::timestamp, NOW() - interval '1 year') as created_at,
  NOW() as updated_at
FROM member_subscription_info msi
JOIN members m ON m.member_code = msi.member_code
WHERE msi.abo_type IS NOT NULL 
  AND TRIM(msi.abo_type) != ''
  AND TRIM(msi.abo_type) != 'Aucun'
  AND msi.valid_from IS NOT NULL;

-- 5. Import des paiements
INSERT INTO payments (member_id, amount_cents, currency, method, category, status, paid_at, memo, created_at, updated_at)
SELECT
  m.id as member_id,
  2000 as amount_cents,
  'EUR' as currency,
  'cash' as method,
  'subscription' as category,
  'completed'::text as status,
  COALESCE(msi.last_payment_date::timestamp, msi.valid_from::timestamp, NOW() - interval '1 year') as paid_at,
  COALESCE(NULLIF(TRIM(msi.payment_note), ''), 'Import historique') as memo,
  COALESCE(msi.last_payment_date::timestamp, msi.valid_from::timestamp, NOW() - interval '1 year') as created_at,
  NOW() as updated_at
FROM member_subscription_info msi
JOIN members m ON m.member_code = msi.member_code
WHERE msi.last_payment_date IS NOT NULL OR msi.valid_from IS NOT NULL;

-- 6. Réactiver le trigger
ALTER TABLE subscriptions ENABLE TRIGGER trg_second_sub_discount;
