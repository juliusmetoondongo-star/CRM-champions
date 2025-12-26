-- ============================================================================
-- VÉRIFICATION DES ABONNEMENTS
-- ============================================================================

-- 1. Compter le nombre total d'abonnements
SELECT 'Total abonnements' as type, COUNT(*) as count
FROM public.subscriptions;

-- 2. Compter par statut
SELECT
  'Statut: ' || COALESCE(status, 'NULL') as type,
  COUNT(*) as count
FROM public.subscriptions
GROUP BY status
ORDER BY count DESC;

-- 3. Vérifier les 10 premiers abonnements avec infos membres
SELECT
  s.id as subscription_id,
  m.member_code,
  m.first_name || ' ' || m.last_name as member_name,
  s.plan_name,
  s.starts_at,
  s.ends_at,
  s.status,
  s.price_cents / 100.0 as price_eur
FROM public.subscriptions s
JOIN public.members m ON s.member_id = m.id
ORDER BY s.starts_at DESC
LIMIT 10;

-- 4. Compter les abonnements par plan
SELECT
  COALESCE(plan_name, 'Sans plan') as plan,
  COUNT(*) as count
FROM public.subscriptions
GROUP BY plan_name
ORDER BY count DESC;

-- 5. Vérifier les membres sans abonnement
SELECT
  'Membres sans abonnement' as type,
  COUNT(*) as count
FROM public.members m
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.member_id = m.id
);

-- 6. Vérifier les abonnements sans membre (orphelins)
SELECT
  'Abonnements orphelins (sans membre)' as type,
  COUNT(*) as count
FROM public.subscriptions s
WHERE NOT EXISTS (
  SELECT 1 FROM public.members m WHERE m.id = s.member_id
);

-- 7. Statistiques des dates d'abonnement
SELECT
  'Abonnements actifs (ends_at > aujourd''hui)' as type,
  COUNT(*) as count
FROM public.subscriptions
WHERE ends_at > CURRENT_DATE
UNION ALL
SELECT
  'Abonnements expirés (ends_at <= aujourd''hui)' as type,
  COUNT(*) as count
FROM public.subscriptions
WHERE ends_at <= CURRENT_DATE
UNION ALL
SELECT
  'Abonnements à venir (starts_at > aujourd''hui)' as type,
  COUNT(*) as count
FROM public.subscriptions
WHERE starts_at > CURRENT_DATE;

-- 8. Vérifier la cohérence status vs dates
SELECT
  'Status: ' || status || ' mais ends_at futur' as issue,
  COUNT(*) as count
FROM public.subscriptions
WHERE status = 'expired' AND ends_at > CURRENT_DATE
GROUP BY status
UNION ALL
SELECT
  'Status: ' || status || ' mais ends_at passé' as issue,
  COUNT(*) as count
FROM public.subscriptions
WHERE status = 'active' AND ends_at < CURRENT_DATE
GROUP BY status;

-- 9. Distribution des abonnements par mois de début
SELECT
  TO_CHAR(starts_at, 'YYYY-MM') as month,
  COUNT(*) as count
FROM public.subscriptions
WHERE starts_at IS NOT NULL
GROUP BY TO_CHAR(starts_at, 'YYYY-MM')
ORDER BY month DESC
LIMIT 12;

-- 10. Test de la jointure membres (celle utilisée dans le code)
SELECT
  'Test jointure subscriptions + members' as test,
  COUNT(*) as count
FROM public.subscriptions s
JOIN public.members m ON s.member_id = m.id;

-- ============================================================================
-- RÉSUMÉ FINAL
-- ============================================================================
SELECT
  '=== RÉSUMÉ ===' as section,
  '' as info
UNION ALL
SELECT
  'Total abonnements',
  COUNT(*)::text
FROM public.subscriptions
UNION ALL
SELECT
  'Total membres',
  COUNT(*)::text
FROM public.members
UNION ALL
SELECT
  'Membres avec abonnement',
  COUNT(DISTINCT member_id)::text
FROM public.subscriptions
UNION ALL
SELECT
  'Abonnements actifs',
  COUNT(*)::text
FROM public.subscriptions
WHERE status = 'active'
UNION ALL
SELECT
  'Abonnements expirés',
  COUNT(*)::text
FROM public.subscriptions
WHERE status = 'expired'
UNION ALL
SELECT
  'Abonnements à venir',
  COUNT(*)::text
FROM public.subscriptions
WHERE status = 'upcoming';
