# 🥊 Champion's Academy CRM - Import des données réelles

## 🚀 Démarrage rapide

### Vous avez le fichier CSV Users_with_badge1.csv ?

Suivez ces 5 étapes simples :

#### 1️⃣ Nettoyer les données existantes

Dans Supabase SQL Editor :

```sql
DELETE FROM public.member_subscription_info;
DELETE FROM public.subscriptions;
```

#### 2️⃣ Importer le CSV

1. Supabase Dashboard → `Table Editor` → `member_subscription_info`
2. Cliquez sur `Insert` → `Import data via spreadsheet`
3. Sélectionnez votre CSV
4. Vérifiez le mapping des colonnes
5. Cliquez sur `Import`

#### 3️⃣ Corriger le type amount_due

```sql
ALTER TABLE public.member_subscription_info
ALTER COLUMN amount_due TYPE numeric
USING NULLIF(amount_due, '')::numeric;
```

#### 4️⃣ Synchroniser les membres

```sql
SELECT sync_members_from_subscription_info();

UPDATE member_subscription_info
SET updated_at = now()
WHERE true;
```

#### 5️⃣ Vérifier

```sql
-- Doit retourner le nombre de lignes du CSV
SELECT COUNT(*) FROM member_subscription_info;

-- Doit retourner les membres actifs
SELECT COUNT(*) FROM member_subscription_info WHERE is_active = true;

-- Doit retourner les KPIs
SELECT * FROM v_dashboard_kpis;
```

## ✅ C'est fait ?

Ouvrez l'application et vérifiez que :

- ✅ Dashboard affiche des chiffres réels (pas 0)
- ✅ Page Membres liste tous les membres
- ✅ Page Abonnements affiche les abonnements
- ✅ Les graphiques contiennent des données

## 📚 Documentation complète

- **Guide détaillé** : `CSV_IMPORT_INSTRUCTIONS.md`
- **Validation SQL** : `supabase/validation_queries.sql`
- **Résumé technique** : `IMPLEMENTATION_SUMMARY.md`

## 🔧 Structure des fichiers créés

```
project/
├── CSV_IMPORT_INSTRUCTIONS.md         ← Guide complet étape par étape
├── IMPLEMENTATION_SUMMARY.md           ← Résumé technique détaillé
├── README_DATA_IMPORT.md              ← Ce fichier (démarrage rapide)
├── supabase/
│   ├── migrations/
│   │   ├── 20251111000000_add_member_subscription_info.sql
│   │   ├── 20251111010000_prepare_for_csv_import.sql
│   │   └── 20251111020000_post_import_constraints.sql
│   └── validation_queries.sql         ← 20+ requêtes de validation
└── src/
    └── lib/
        ├── supabaseQueries.ts         ← Requêtes centralisées (optimisé)
        └── subscriptionHelper.ts      ← Helpers d'abonnement
```

## 🎯 Ce qui a été fait

### ✅ Base de données
- Table `member_subscription_info` créée avec toutes les colonnes
- Colonnes manquantes ajoutées à `members`, `subscriptions`, `payments`
- Triggers automatiques pour calculer `is_active` et `member_status`
- Vues optimisées : `v_dashboard_kpis`, `v_active_members_by_discipline`
- Foreign keys et contraintes
- Index de performance

### ✅ Code React
- Toutes les requêtes dans `supabaseQueries.ts`
- Utilisation des vues pour performance
- Fallback si vues pas disponibles
- Architecture centralisée avec `refreshKey`
- Toutes les pages connectées

### ✅ Fonctionnalités
- Dashboard avec vrais KPIs
- Graphiques check-ins 30 jours
- Graphiques revenus 12 mois
- Graphique disciplines (pie chart)
- Page Membres avec filtres
- Page Abonnements avec filtres
- Page Paiements avec détails
- Page Compta avec totaux
- Check-ins avec scan RFID

## 🐛 Problèmes courants

### "Dashboard affiche 0"
→ CSV pas encore importé ou vues pas créées
```sql
SELECT COUNT(*) FROM member_subscription_info; -- Doit être > 0
```

### "Foreign key constraint violation"
→ Membres pas synchronisés
```sql
SELECT sync_members_from_subscription_info();
```

### "amount_due is text"
→ Type pas converti
```sql
ALTER TABLE member_subscription_info
ALTER COLUMN amount_due TYPE numeric
USING NULLIF(amount_due, '')::numeric;
```

## 📊 Mapping du CSV

Votre CSV doit contenir ces colonnes :

| Colonne CSV    | Type      | Description                    |
|---------------|-----------|--------------------------------|
| member_code   | text      | Code Bushiwa (M0001...)        |
| full_name     | text      | Nom complet du membre          |
| discipline    | text      | Boxe Thaï, Anglaise, etc.      |
| abo_type      | text      | Type d'abonnement (Free2)      |
| valid_from    | date      | Date début (YYYY-MM-DD)        |
| valid_to      | date      | Date fin (YYYY-MM-DD)          |
| is_active     | boolean   | true/false                     |
| member_status | text      | active/expired/inactive        |
| amount_due    | numeric   | Solde en € (ex: 25.50)         |
| payment_note  | text      | Note de paiement               |
| card_uid      | text      | Numéro RFID                    |

## 🎓 Comment ça marche ?

```
CSV Import
    ↓
member_subscription_info (table)
    ↓
Trigger: calcul automatique is_active + member_status
    ↓
Vues SQL (v_dashboard_kpis, etc.)
    ↓
supabaseQueries.ts (React)
    ↓
Pages (Dashboard, Membres, etc.)
    ↓
Affichage des vraies données
```

## 🚨 Checklist avant de dire "C'est fait !"

- [ ] CSV importé dans `member_subscription_info`
- [ ] `amount_due` est de type `numeric`
- [ ] `sync_members_from_subscription_info()` exécuté
- [ ] `SELECT COUNT(*) FROM member_subscription_info;` retourne > 0
- [ ] `SELECT * FROM v_dashboard_kpis;` retourne des données
- [ ] Dashboard affiche des chiffres réels
- [ ] Page Membres affiche la liste
- [ ] Pas d'erreurs dans la console navigateur

## 🎉 Résultat final

Une fois l'import terminé, vous aurez :

✅ **Dashboard vivant** avec KPIs réels
✅ **Graphiques remplis** avec historique
✅ **Page Membres** avec tous vos membres
✅ **Page Abonnements** avec dates et statuts corrects
✅ **Page Paiements** avec historique
✅ **Page Compta** avec totaux par méthode
✅ **Scan RFID** fonctionnel avec les cartes

## 💪 Besoin d'aide ?

1. Consultez `CSV_IMPORT_INSTRUCTIONS.md` pour le guide détaillé
2. Exécutez `supabase/validation_queries.sql` pour valider
3. Lisez `IMPLEMENTATION_SUMMARY.md` pour comprendre l'architecture
4. Vérifiez les logs Supabase : Dashboard → Logs → Postgres Logs

---

**Note** : Les migrations SQL sont automatiquement appliquées par Supabase. Vous n'avez qu'à importer le CSV et exécuter les commandes SQL ci-dessus.

🥊 **Bon courage avec Champion's Academy !**
