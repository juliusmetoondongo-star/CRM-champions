/*
  # Création des fonctions RPC pour le dashboard basé sur member_subscription_info

  1. Fonctions créées
    - get_dashboard_counts() : Statistiques générales (membres actifs, revenus, etc.)
    - get_active_members_by_discipline() : Répartition des membres actifs par discipline
    - get_checkins_chart_30days() : Historique des check-ins sur 30 jours
    - get_revenue_chart_12months() : Historique des revenus sur 12 mois
  
  2. Source de données
    - Utilise member_subscription_info (données CSV importées)
    - Compatible avec les colonnes: is_active, member_status, discipline, amount_due
  
  3. Sécurité
    - Toutes les fonctions sont SECURITY DEFINER
    - Accessibles uniquement aux utilisateurs authentifiés
*/

-- Fonction 1: Statistiques du dashboard
CREATE OR REPLACE FUNCTION get_dashboard_counts()
RETURNS TABLE (
  active_members bigint,
  inactive_members bigint,
  today_checkins bigint,
  revenue_mtd numeric,
  remaining_due numeric,
  nb_in_arrears bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Membres actifs (is_active = true)
    (SELECT COUNT(*) FROM member_subscription_info WHERE is_active = true)::bigint,
    
    -- Membres inactifs (is_active = false)
    (SELECT COUNT(*) FROM member_subscription_info WHERE is_active = false)::bigint,
    
    -- Check-ins d'aujourd'hui
    (SELECT COUNT(*) FROM checkins WHERE DATE(scanned_at) = CURRENT_DATE)::bigint,
    
    -- Revenus du mois en cours (somme des paiements)
    (SELECT COALESCE(SUM(amount_cents), 0) / 100.0 
     FROM payments 
     WHERE DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE))::numeric,
    
    -- Montants dus restants (somme des amount_due)
    (SELECT COALESCE(SUM(amount_due), 0) FROM member_subscription_info WHERE amount_due > 0)::numeric,
    
    -- Nombre de membres en retard de paiement
    (SELECT COUNT(*) FROM member_subscription_info WHERE amount_due > 0)::bigint;
END;
$$;

-- Fonction 2: Répartition des membres actifs par discipline
CREATE OR REPLACE FUNCTION get_active_members_by_discipline()
RETURNS TABLE (
  discipline text,
  active_members bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(m.discipline, 'Inconnu') as discipline,
    COUNT(*)::bigint as active_members
  FROM member_subscription_info m
  WHERE m.is_active = true
  GROUP BY m.discipline
  HAVING COUNT(*) > 0
  ORDER BY active_members DESC;
END;
$$;

-- Fonction 3: Check-ins sur les 30 derniers jours
CREATE OR REPLACE FUNCTION get_checkins_chart_30days()
RETURNS TABLE (
  label text,
  value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '29 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date as day
  )
  SELECT 
    TO_CHAR(d.day, 'DD/MM') as label,
    COALESCE(COUNT(c.id), 0)::bigint as value
  FROM dates d
  LEFT JOIN checkins c ON DATE(c.scanned_at) = d.day
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;

-- Fonction 4: Revenus sur les 12 derniers mois
CREATE OR REPLACE FUNCTION get_revenue_chart_12months()
RETURNS TABLE (
  month text,
  value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
      DATE_TRUNC('month', CURRENT_DATE),
      INTERVAL '1 month'
    )::date as month_start
  )
  SELECT 
    TO_CHAR(m.month_start, 'Mon') as month,
    COALESCE(SUM(p.amount_cents), 0)::numeric / 100.0 as value
  FROM months m
  LEFT JOIN payments p ON DATE_TRUNC('month', p.paid_at) = m.month_start
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_dashboard_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_members_by_discipline() TO authenticated;
GRANT EXECUTE ON FUNCTION get_checkins_chart_30days() TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_chart_12months() TO authenticated;
