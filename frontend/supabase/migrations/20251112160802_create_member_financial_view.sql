/*
  # Create member financial status view
  
  1. New Views
    - `member_financial_status`: Vue combinant membres, abonnements et paiements
      - Informations membres (id, nom, email)
      - Informations abonnement actif (discipline, plan, dates, statut)
      - Informations paiements (dernier paiement, total payé, reste à payer)
  
  2. Purpose
    - Fournir une vue complète pour le suivi financier des membres
    - Calculer automatiquement les montants payés et restants
    - Afficher le statut des abonnements avec jours restants
*/

CREATE OR REPLACE VIEW member_financial_status AS
SELECT 
  m.id as member_id,
  CONCAT(m.first_name, ' ', m.last_name) as member_name,
  m.email,
  m.phone,
  m.member_code,
  
  -- Abonnement actif
  active_sub.discipline,
  active_sub.plan_name,
  active_sub.subscription_status,
  active_sub.starts_at,
  active_sub.ends_at,
  active_sub.price_cents,
  
  -- Calcul jours restants
  CASE 
    WHEN active_sub.ends_at IS NOT NULL 
    THEN GREATEST(0, DATE_PART('day', active_sub.ends_at::timestamp - CURRENT_DATE::timestamp)::integer)
    ELSE NULL 
  END as days_remaining,
  
  -- Paiements
  COALESCE(payments_summary.last_payment_date, NULL) as last_payment_date,
  COALESCE(payments_summary.total_paid_cents, 0) / 100.0 as total_paid_eur,
  COALESCE(active_sub.price_cents, 0) / 100.0 as plan_price_eur,
  
  -- Calculs financiers
  CASE 
    WHEN active_sub.price_cents IS NOT NULL AND active_sub.price_cents > 0
    THEN ROUND((COALESCE(payments_summary.total_paid_cents, 0)::numeric / active_sub.price_cents::numeric * 100), 1)
    ELSE 0
  END as percent_paid,
  
  CASE 
    WHEN active_sub.price_cents IS NOT NULL
    THEN GREATEST(0, (active_sub.price_cents - COALESCE(payments_summary.total_paid_cents, 0)) / 100.0)
    ELSE 0
  END as remaining_eur

FROM members m

-- Abonnement actif (ou le plus récent)
LEFT JOIN LATERAL (
  SELECT 
    s.discipline,
    s.plan_name,
    s.status as subscription_status,
    s.starts_at,
    s.ends_at,
    s.price_cents
  FROM subscriptions s
  WHERE s.member_id = m.id
  ORDER BY 
    CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
    s.starts_at DESC
  LIMIT 1
) active_sub ON true

-- Résumé des paiements
LEFT JOIN LATERAL (
  SELECT 
    MAX(p.paid_at) as last_payment_date,
    SUM(p.amount_cents) as total_paid_cents
  FROM payments p
  WHERE p.member_id = m.id
    AND p.category IN ('subscription', 'membership')
) payments_summary ON true

ORDER BY m.last_name, m.first_name;
