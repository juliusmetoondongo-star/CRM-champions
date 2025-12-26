/*
  # Ajouter le suivi de l'assurance aux membres avec validation

  1. Modifications
    - Ajouter insurance_paid_at: date de paiement de l'assurance
    - Ajouter insurance_expires_at: date d'expiration (1 an après)
  
  2. Import des données avec validation
    - Parser les dates du format DD/MM/YYYY
    - Ignorer les dates invalides
    - Calculer la date d'expiration (+1 an)
*/

-- 1. Ajouter les colonnes d'assurance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'insurance_paid_at'
  ) THEN
    ALTER TABLE members ADD COLUMN insurance_paid_at DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'insurance_expires_at'
  ) THEN
    ALTER TABLE members ADD COLUMN insurance_expires_at DATE;
  END IF;
END $$;

-- 2. Créer une fonction pour parser les dates de manière sécurisée
CREATE OR REPLACE FUNCTION safe_parse_date(date_str text)
RETURNS date AS $$
BEGIN
  RETURN TO_DATE(date_str, 'DD/MM/YYYY');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Importer les données d'assurance
UPDATE members m
SET 
  insurance_paid_at = safe_parse_date(msi.insurance),
  insurance_expires_at = safe_parse_date(msi.insurance) + INTERVAL '1 year',
  updated_at = NOW()
FROM member_subscription_info msi
WHERE m.member_code = msi.member_code
  AND msi.insurance IS NOT NULL
  AND msi.insurance != ''
  AND safe_parse_date(msi.insurance) IS NOT NULL;
