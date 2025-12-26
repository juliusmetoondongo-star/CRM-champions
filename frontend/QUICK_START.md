# Champion's Academy CRM - Guide de Démarrage Rapide

## 🚀 Démarrage en 3 Minutes

### Étape 1: Configurer Supabase (2 minutes)

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com
   - Sélectionner votre projet

2. **Exécuter le script SQL**
   - Cliquer sur `SQL Editor` dans le menu latéral
   - Cliquer sur `New query`
   - Ouvrir le fichier `supabase-setup.sql` du projet
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur `Run` (en bas à droite)

3. **Vérifier l'exécution**
   - Attendre la fin de l'exécution (environ 30 secondes)
   - Vérifier qu'il n'y a pas d'erreurs rouges
   - Vous devriez voir plusieurs messages de succès verts

4. **Initialiser les abonnements**
   ```sql
   SELECT public.initialize_subscriptions();
   ```
   - Copier cette ligne
   - Coller dans un nouveau query
   - Cliquer sur `Run`
   - Note le nombre d'abonnements créés

### Étape 2: Vérifier les Données (30 secondes)

Exécuter ces requêtes de validation:

```sql
-- Vérifier les KPIs
SELECT * FROM public.kpi_bundle;

-- Vérifier les membres
SELECT * FROM public.members_directory_view LIMIT 10;

-- Vérifier les disciplines
SELECT * FROM public.active_members_by_discipline;

-- Vérifier les revenus
SELECT * FROM public.revenue_per_month LIMIT 6;
```

**Résultats attendus:**
- `kpi_bundle`: 1 ligne avec les KPIs (active_members, revenue_mtd, etc.)
- `members_directory_view`: Liste des membres avec disciplines
- `active_members_by_discipline`: Distribution par discipline
- `revenue_per_month`: Revenus des derniers mois

### Étape 3: Tester l'Application (30 secondes)

1. **Lancer l'application**
   ```bash
   npm run dev
   ```

2. **Ouvrir dans le navigateur**
   - http://localhost:5173
   - Se connecter avec vos identifiants Supabase

3. **Vérifier le Dashboard**
   - Les KPIs s'affichent (Membres actifs, Revenus, etc.)
   - Les graphiques se chargent
   - Pas d'erreurs dans la console (F12)

4. **Vérifier les Membres**
   - Aller sur `/members`
   - La liste des membres s'affiche
   - Tester la recherche
   - Cliquer sur un membre → détails s'affichent

---

## ✅ Checklist de Validation

### Infrastructure Supabase
- [ ] Script SQL exécuté sans erreurs
- [ ] 7 tables créées (disciplines, plans, members, subscriptions, payments, checkins, member_disciplines)
- [ ] 5 vues créées (kpi_bundle, members_directory_view, v_member_status, active_members_by_discipline, revenue_per_month)
- [ ] RLS activé sur toutes les tables
- [ ] Abonnements initialisés (au moins 1)

### Application Frontend
- [ ] `npm run build` réussit
- [ ] Dashboard affiche des KPIs
- [ ] Dashboard affiche les graphiques
- [ ] Members affiche la liste
- [ ] Members: recherche fonctionne
- [ ] Members: détails s'affichent au clic
- [ ] Aucune erreur dans la console

---

## 🐛 Dépannage

### Erreur: "relation does not exist"

**Cause:** Les tables ou vues n'ont pas été créées

**Solution:**
1. Re-exécuter le script `supabase-setup.sql`
2. Vérifier qu'il n'y a pas d'erreurs SQL
3. Vérifier que vous êtes sur le bon projet Supabase

### Erreur: "permission denied for table"

**Cause:** RLS bloque l'accès

**Solution:**
1. Vérifier que les politiques RLS sont créées
2. Vérifier que vous êtes authentifié
3. Re-exécuter la section "SECTION 4: RLS POLICIES" du script

### Dashboard affiche "0" partout

**Cause:** Pas de données dans les tables

**Solution:**
1. Exécuter `SELECT public.initialize_subscriptions();`
2. Vérifier que des membres existent
3. Créer quelques paiements manuellement si nécessaire

### Erreur TypeScript lors du build

**Cause:** Types non synchronisés

**Solution:**
```bash
npm run typecheck
```
Corriger les erreurs affichées

### Graphiques vides

**Cause:** Pas assez de données historiques

**Solution:**
1. Créer des paiements sur plusieurs mois
2. Créer des check-ins sur plusieurs jours
3. Les graphiques se rempliront automatiquement

---

## 📊 Données d'Exemple

Si vous voulez des données de test, exécutez:

```sql
-- Créer des membres de test
INSERT INTO public.members (member_code, first_name, last_name, email, status)
VALUES
  ('M0001', 'Jean', 'Dupont', 'jean.dupont@test.com', 'active'),
  ('M0002', 'Marie', 'Martin', 'marie.martin@test.com', 'active'),
  ('M0003', 'Pierre', 'Durand', 'pierre.durand@test.com', 'active');

-- Créer des abonnements
SELECT public.initialize_subscriptions();

-- Créer des paiements de test
INSERT INTO public.payments (member_id, amount_cents, status, paid_at)
SELECT
  id,
  5000,
  'completed',
  CURRENT_DATE - (random() * 30)::integer * INTERVAL '1 day'
FROM public.members
LIMIT 10;

-- Créer des check-ins de test
INSERT INTO public.checkins (member_id, scanned_at)
SELECT
  id,
  CURRENT_DATE - (random() * 7)::integer * INTERVAL '1 day'
FROM public.members
LIMIT 20;
```

---

## 🎯 Prochaines Étapes

### Étape 1: Vérifier (vous êtes ici)
- [x] Script SQL exécuté
- [x] Application démarre
- [x] Dashboard fonctionne
- [x] Members fonctionne

### Étape 2: Utiliser
- [ ] Créer de vrais membres
- [ ] Enregistrer de vrais paiements
- [ ] Utiliser le scan RFID
- [ ] Suivre les check-ins

### Étape 3: Optimiser (optionnel)
- [ ] Migrer les pages restantes vers Q.*
- [ ] Activer le Realtime sur Dashboard
- [ ] Personnaliser les plans d'abonnement
- [ ] Ajouter des rapports personnalisés

---

## 📞 Support

### Documentation Complète
- `VALIDATION_REPORT.md` - Rapport détaillé de validation
- `DATA_CONNECTION_SUMMARY.md` - Guide de la couche de données
- `SUPABASE_VIEWS_MAPPING.md` - Mapping des vues Supabase
- `CSV_IMPORT_INSTRUCTIONS.md` - Import de données CSV

### Logs et Debugging
- Console navigateur (F12) pour les erreurs frontend
- Supabase Dashboard → Logs → Postgres Logs pour les erreurs backend
- `console.error` dans les fonctions pour tracer les appels

### Vérifications Rapides
```sql
-- Combien de membres ?
SELECT COUNT(*) FROM public.members;

-- Combien d'abonnements actifs ?
SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active';

-- Dernier check-in ?
SELECT * FROM public.checkins ORDER BY scanned_at DESC LIMIT 1;

-- KPIs actuels ?
SELECT * FROM public.kpi_bundle;
```

---

## ✅ Vous avez terminé !

Votre CRM Champion's Academy est maintenant opérationnel ! 🎉

- ✅ Base de données configurée
- ✅ Vues et fonctions créées
- ✅ Application connectée
- ✅ Pages principales fonctionnelles

**Prochaine action:** Commencer à utiliser l'application avec vos vraies données !

Pour toute question, consulter les fichiers de documentation du projet.

---

**Dernière mise à jour:** 2025-11-12
**Version:** 1.0.0
