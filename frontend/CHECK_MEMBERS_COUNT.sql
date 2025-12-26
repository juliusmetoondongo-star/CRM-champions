-- ============================================================================
-- VÉRIFICATION DU NOMBRE DE MEMBRES
-- ============================================================================

-- 1. Compter les membres dans la table members
SELECT 'Table members' as source, COUNT(*) as count
FROM public.members;

-- 2. Compter les membres dans la vue members_directory_view
SELECT 'Vue members_directory_view' as source, COUNT(*) as count
FROM public.members_directory_view;

-- 3. Vérifier s'il y a des membres sans prénom/nom (pourraient être filtrés)
SELECT 'Membres sans nom' as type, COUNT(*) as count
FROM public.members
WHERE first_name IS NULL AND last_name IS NULL;

-- 4. Compter par statut
SELECT
  'Statut: ' || COALESCE(status, 'NULL') as type,
  COUNT(*) as count
FROM public.members
GROUP BY status
ORDER BY count DESC;

-- 5. Vérifier les 10 premiers membres de la vue
SELECT *
FROM public.members_directory_view
LIMIT 10;

-- 6. Vérifier s'il y a une limite dans la définition de la vue
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'members_directory_view';
