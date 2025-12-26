# Instructions pour l'import du fichier CSV Users_with_badge1

Ce document explique comment importer les données réelles depuis le fichier CSV dans la base de données Supabase.

## 📋 Prérequis

- Fichier CSV `Users_with_badge1.csv` (ou `members_subscription_info.csv`) avec les colonnes suivantes :
  - member_code
  - full_name
  - discipline
  - abo_type
  - valid_from
  - valid_to
  - is_active
  - member_status
  - amount_due
  - payment_note
  - card_uid

## 🚀 Procédure d'import (étape par étape)

### Étape 1 : Appliquer la migration de préparation

Les migrations ont déjà été créées dans le projet. Assurez-vous qu'elles sont appliquées :

1. Ouvrez le Dashboard Supabase
2. Allez dans `Database` → `Migrations`
3. Vérifiez que ces migrations sont appliquées :
   - `20251111000000_add_member_subscription_info.sql`
   - `20251111010000_prepare_for_csv_import.sql`

Si elles ne sont pas appliquées, Supabase les appliquera automatiquement au déploiement.

### Étape 2 : Nettoyer les données existantes

Exécutez ce SQL dans `SQL Editor` de Supabase :

```sql
-- Nettoyer les données existantes
DELETE FROM public.member_subscription_info;
DELETE FROM public.subscriptions;

-- Vérifier que les tables sont vides
SELECT COUNT(*) FROM member_subscription_info; -- doit retourner 0
SELECT COUNT(*) FROM subscriptions; -- doit retourner 0
```

### Étape 3 : Importer le fichier CSV

1. Dans Supabase Dashboard, allez dans `Table Editor`
2. Sélectionnez la table `member_subscription_info`
3. Cliquez sur `Import data via spreadsheet`
4. Sélectionnez votre fichier CSV
5. **Important** : Mappez les colonnes comme suit :

| Colonne CSV        | Colonne DB         | Type     |
|-------------------|--------------------|----------|
| member_code       | member_code        | text     |
| full_name         | full_name          | text     |
| discipline        | discipline         | text     |
| abo_type          | abo_type           | text     |
| valid_from        | valid_from         | date     |
| valid_to          | valid_to           | date     |
| is_active         | is_active          | boolean  |
| member_status     | member_status      | text     |
| amount_due        | amount_due         | numeric  |
| payment_note      | payment_note       | text     |
| card_uid          | card_uid           | text     |

6. **IMPORTANT** : Si `amount_due` est importé comme `text`, il faudra le corriger (voir Étape 4)

7. Cliquez sur `Import`

### Étape 4 : Corriger le type de amount_due (si nécessaire)

Si `amount_due` a été importé comme `text`, exécutez ce SQL :

```sql
-- Convertir amount_due de text à numeric
ALTER TABLE public.member_subscription_info
ALTER COLUMN amount_due TYPE numeric
USING NULLIF(amount_due, '')::numeric;

-- Mettre 0 pour les valeurs NULL
UPDATE public.member_subscription_info
SET amount_due = 0
WHERE amount_due IS NULL;
```

### Étape 5 : Appliquer la migration post-import

Exécutez la migration `20251111020000_post_import_constraints.sql` ou exécutez ce SQL :

```sql
-- Synchroniser les membres depuis member_subscription_info
SELECT sync_members_from_subscription_info();

-- Ajouter la contrainte de clé étrangère
ALTER TABLE public.member_subscription_info
DROP CONSTRAINT IF EXISTS fk_member_subscription_info_member_code;

ALTER TABLE public.member_subscription_info
ADD CONSTRAINT fk_member_subscription_info_member_code
FOREIGN KEY (member_code)
REFERENCES public.members(member_code)
ON DELETE CASCADE;

-- Forcer la mise à jour des statuts
UPDATE member_subscription_info
SET updated_at = now()
WHERE true;
```

### Étape 6 : Validation des données

Exécutez ces requêtes pour valider l'import :

```sql
-- 1. Nombre total de lignes
SELECT COUNT(*) AS total_rows FROM member_subscription_info;

-- 2. Distribution par discipline
SELECT discipline, COUNT(*) as count
FROM member_subscription_info
GROUP BY discipline
ORDER BY count DESC;

-- 3. Membres actifs
SELECT COUNT(*) AS actifs FROM member_subscription_info WHERE is_active = true;

-- 4. Soldes à payer
SELECT
  SUM(amount_due) AS total_due,
  COUNT(*) AS membres_en_retard
FROM member_subscription_info
WHERE amount_due > 0;

-- 5. Distribution par statut
SELECT member_status, COUNT(*) as count
FROM member_subscription_info
GROUP BY member_status
ORDER BY count DESC;

-- 6. Vérifier la vue dashboard
SELECT * FROM v_dashboard_kpis;

-- 7. Vérifier que les membres existent
SELECT
  m.member_code,
  m.first_name,
  m.last_name,
  m.email,
  msi.discipline,
  msi.is_active,
  msi.amount_due
FROM members m
JOIN member_subscription_info msi ON m.member_code = msi.member_code
LIMIT 10;
```

## ✅ Résultats attendus

Après l'import, vous devriez voir :

- **Total de lignes** : Le nombre de membres dans votre fichier CSV (ex: 150-200)
- **Membres actifs** : Les membres dont `valid_to >= aujourd'hui`
- **Disciplines** : Distribution réaliste (ex: "Boxe Thaï", "Boxe Anglaise", "Muay Thai")
- **Soldes à payer** : Total des `amount_due > 0`

## 🔍 Vérification dans l'application

Une fois l'import terminé :

1. **Dashboard** :
   - Les KPIs affichent des chiffres réels (pas 0)
   - Le graphique "Membres actifs par discipline" montre la distribution
   - Les chiffres correspondent aux résultats SQL

2. **Page Membres** :
   - La liste affiche tous les membres avec leur discipline
   - Les filtres par discipline fonctionnent
   - Le statut d'abonnement est correct

3. **Page Abonnements** :
   - Liste complète des abonnements depuis `member_subscription_info`
   - Filtres par discipline et statut opérationnels
   - Dates `valid_from` et `valid_to` visibles

4. **Page Paiements** :
   - Les membres avec `amount_due > 0` apparaissent en retard

## 🐛 Dépannage

### Problème : "Foreign key constraint violation"

**Solution** : Les `member_code` du CSV n'existent pas dans `members`.

```sql
-- Synchroniser les membres
SELECT sync_members_from_subscription_info();
```

### Problème : "amount_due is not numeric"

**Solution** : Le type n'a pas été converti correctement.

```sql
ALTER TABLE public.member_subscription_info
ALTER COLUMN amount_due TYPE numeric
USING NULLIF(amount_due, '')::numeric;
```

### Problème : "is_active reste à false pour tout le monde"

**Solution** : Le trigger ne s'est pas exécuté.

```sql
-- Forcer la mise à jour
UPDATE member_subscription_info
SET updated_at = now()
WHERE true;
```

### Problème : "Dashboard affiche toujours 0"

**Solution** : Vérifier que les vues existent.

```sql
-- Créer les vues si elles n'existent pas
-- (voir migration 20251111020000_post_import_constraints.sql)
```

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Supabase dans `Logs` → `Postgres Logs`
2. Exécutez les requêtes de validation
3. Vérifiez que toutes les migrations sont appliquées

## 🎯 Checklist finale

- [ ] Migration de préparation appliquée
- [ ] Données existantes nettoyées
- [ ] CSV importé dans `member_subscription_info`
- [ ] Type `amount_due` corrigé en `numeric`
- [ ] Fonction `sync_members_from_subscription_info()` exécutée
- [ ] Contrainte de clé étrangère ajoutée
- [ ] Statuts mis à jour (trigger)
- [ ] Vues créées (`v_dashboard_kpis`, etc.)
- [ ] Requêtes de validation exécutées
- [ ] Dashboard affiche des chiffres réels
- [ ] Toutes les pages fonctionnent correctement

Une fois cette checklist complétée, l'application Champion's Academy CRM est prête à l'emploi avec les vraies données ! 🎉
