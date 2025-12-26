/*
  # Correction des types de colonnes dans member_subscription_info

  1. Modifications
    - Supprimer temporairement les vues dépendantes
    - Convertir valid_from de text vers date
    - Convertir valid_to de text vers date
    - Recréer les vues
  
  2. Recalcul
    - Recalculer is_active basé sur les dates
    - Recalculer member_status (active/expired/upcoming)
*/

-- Étape 1: Supprimer les vues dépendantes
DROP VIEW IF EXISTS active_members CASCADE;
DROP VIEW IF EXISTS expired_members CASCADE;
DROP VIEW IF EXISTS members_with_balance CASCADE;

-- Étape 2: Convertir valid_from en date
ALTER TABLE member_subscription_info 
ALTER COLUMN valid_from TYPE date USING 
  CASE 
    WHEN valid_from IS NULL OR valid_from = '' THEN NULL
    ELSE valid_from::date
  END;

-- Étape 3: Convertir valid_to en date
ALTER TABLE member_subscription_info 
ALTER COLUMN valid_to TYPE date USING 
  CASE 
    WHEN valid_to IS NULL OR valid_to = '' THEN NULL
    ELSE valid_to::date
  END;

-- Étape 4: Recalculer is_active et member_status pour tous les membres
UPDATE member_subscription_info
SET 
  is_active = CASE
    WHEN valid_from IS NOT NULL AND valid_to IS NOT NULL 
      THEN (CURRENT_DATE >= valid_from AND CURRENT_DATE <= valid_to)
    ELSE false
  END,
  member_status = CASE
    WHEN valid_from IS NULL OR valid_to IS NULL THEN 'unknown'
    WHEN CURRENT_DATE >= valid_from AND CURRENT_DATE <= valid_to THEN 'active'
    WHEN CURRENT_DATE > valid_to THEN 'expired'
    ELSE 'upcoming'
  END;

-- Étape 5: Recréer la vue active_members
CREATE OR REPLACE VIEW active_members AS
SELECT 
  member_code,
  full_name,
  discipline,
  valid_from,
  valid_to,
  abo_type
FROM member_subscription_info
WHERE is_active = true;

-- Étape 6: Recréer la vue expired_members
CREATE OR REPLACE VIEW expired_members AS
SELECT 
  member_code,
  full_name,
  discipline,
  valid_from,
  valid_to,
  abo_type
FROM member_subscription_info
WHERE member_status = 'expired';

-- Étape 7: Recréer la vue members_with_balance
CREATE OR REPLACE VIEW members_with_balance AS
SELECT 
  member_code,
  full_name,
  discipline,
  amount_due,
  payment_note,
  last_payment_date
FROM member_subscription_info
WHERE amount_due > 0;
