# Champion's Academy CRM - Supabase Views Mapping

## 📊 Architecture de données

Ce document décrit comment l'application Champion's Academy CRM est connectée à Supabase en utilisant les vues (READ) et les tables (WRITE).

### Principes

- **READ** : Privilégier les vues (unrestricted, read-only, pré-agrégées)
- **WRITE** : Uniquement via les tables de base (transactions atomiques + audit)
- **REALTIME** : Check-ins et notifications via Realtime Channels

---

## 🏠 Dashboard (Accueil)

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `v_dashboard_counts` | `getDashboardCounts()` | KPIs: membres actifs, abonnements actifs, impayés, check-ins 24h |
| `v_chart_revenue_12m` | `getRevenueChart12Months()` | Graphique revenus 12 mois |
| `v_chart_checkins_30d` | `getCheckinsChart30Days()` | Graphique check-ins 30 jours |
| `v_chart_subscriptions_status` | `getSubscriptionsStatusChart()` | Répartition abonnements (actifs/expirés/suspendus) |
| `outstanding_balances` | `getTopOutstanding()` | Top 5 impayés récents |
| `audit_logs` | `getRecentActivity()` | Activité récente (limite 10) |

### Tables (WRITE)

Aucune écriture directe depuis le Dashboard.

### Actions disponibles

- Boutons vers listes filtrées : "Voir impayés", "Abonnements qui expirent"

---

## 👥 Membres

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `members_directory_view` | `getMembersDirectory()` | Liste des membres (nom, email, phone, statut) |
| `v_member_status` | `getMemberStatus()` | Statut détaillé d'un membre |
| `v_member_balance` | `getMemberBalance()` | Solde d'un membre |
| `v_member_active_subscriptions` | `getMemberActiveSubscriptions()` | Abonnements actifs d'un membre |

### Tables (WRITE)

| Table | Fonctions | Actions |
|-------|-----------|---------|
| `members` | `createMember()`, `updateMember()`, `getMemberById()`, `getMemberByCardUID()` | Créer/éditer membre, lier carte RFID |
| `profiles` | - | Lié aux membres (profil détaillé) |
| `member_disciplines` | `getMemberDisciplines()`, `addMemberDiscipline()`, `removeMemberDiscipline()` | Gérer les disciplines d'un membre |

### Filtres disponibles

- Texte : nom / email / téléphone
- Statut : actif / inactif / suspendu
- Discipline : via `active_members_by_discipline`

### Fiche membre (onglets)

1. **Profil** : `members` + `profiles` (READ/WRITE)
2. **Disciplines** : `member_disciplines` (READ/WRITE)
3. **Abonnements** : `v_member_active_subscriptions` + historique `subscriptions` (READ/WRITE)
4. **Paiements** : `payments` + `receipts` (READ/WRITE)
5. **Check-ins** : `checkins` (limite 50)
6. **Messages** : `message_templates`, `outbound_messages`, `email_logs`

---

## 📅 Abonnements

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `subscriptions_directory_view` | `getSubscriptionsDirectory()` | Liste des abonnements avec détails membre & plan |
| `subs_status_counts` | `getSubscriptionStatusCounts()` | KPIs par statut |
| `subs_expiring_7d` | `getSubscriptionsDirectory({ expiringInDays: 7 })` | Abonnements qui expirent dans 7 jours |

### Tables (WRITE)

| Table | Fonctions | Actions |
|-------|-----------|---------|
| `subscriptions` | `getMemberSubscriptions()`, `createSubscription()`, `updateSubscriptionStatus()` | Créer/modifier/pause/reprendre/annuler |
| `payment_schedules` | - | Échéancier de paiement (créé avec abonnement) |

### Filtres disponibles

- Statut : actif / en pause / expiré / suspendu
- Plan : id du plan
- Date d'expiration

### Actions disponibles

- Pause / Reprendre : `updateSubscriptionStatus(id, 'paused')`
- Annuler : `updateSubscriptionStatus(id, 'canceled', today)`
- Prolonger / Renouveler : update dates ou insert nouvelle ligne

---

## 💰 Paiements

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `payments_full_view` | `getPaymentsDirectory()` | Liste des paiements avec détails membre |
| `payments_directory_view` | Alternative | Autre vue paiements (si différente) |
| `revenue_per_month` | `getRevenuePerMonth()` | Revenus par mois (12 derniers) |
| `revenue_monthly_12m` | Alternative | Revenus mensuels 12 mois |

### Tables (WRITE)

| Table | Fonctions | Actions |
|-------|-----------|---------|
| `payments` | `getMemberPayments()`, `createPayment()`, `updatePaymentStatus()` | Ajouter/modifier paiement |
| `receipts` | `createReceipt()` | Générer/lier un reçu |

### Filtres disponibles

- Statut : settled / pending / failed
- Méthode : cash / card / sepa / online
- Période : dates de début et fin
- Membre : id du membre

### Actions disponibles

- Ajouter un paiement manuel
- Générer un reçu
- Marquer "échoué" / "remboursé"

---

## 📊 Plans & Tarifs

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `kpi_revenue_month_to_date` | - | Revenus du mois par plan |
| `outstanding_by_plan` | `getOutstandingByPlan()` | Impayés par plan |

### Tables (WRITE)

| Table | Fonctions | Actions |
|-------|-----------|---------|
| `plans` | `getActivePlans()`, `getAllPlans()`, `createPlan()`, `updatePlan()` | Créer/éditer/activer/désactiver plan |
| `products` | - | Produits liés aux plans |

---

## ⏰ Check-ins

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `v_chart_checkins_30d` | `getCheckinsChart30Days()` | Vue 30 jours (graphique) |

### Tables (WRITE & REALTIME)

| Table | Fonctions | Actions |
|-------|-----------|---------|
| `checkins` | `getRecentCheckins()`, `getMemberCheckins()`, `createCheckin()`, `subscribeToCheckins()` | Ajouter check-in, temps réel |

### Flux temps réel

- S'abonner à `checkins` : `subscribeToCheckins(callback)`
- Affichage live (ordre desc, limite 50)

---

## 🔍 Scan

### Processus

1. Champ d'entrée : Carte / UID / Code barre
2. **Lookup** : `getMemberByCardUID(uid)` ou chercher par `member_code`
3. **Validation** : `validateMemberCheckin(memberId)`
   - Utilise `v_member_status` (actif ?)
   - Utilise `v_member_balance` (impayé ?)
4. **Si OK** : `createCheckin()` + toast "Accès OK"
5. **Si KO** : bloquer + afficher raison

### Vues utilisées

| Vue | Fonction | Description |
|-----|----------|-------------|
| `v_member_status` | `validateMemberCheckin()` | Vérifier si membre actif |
| `v_member_balance` | `validateMemberCheckin()` | Vérifier solde |

### Tables (WRITE)

| Table | Fonctions | Actions |
|-------|-----------|---------|
| `checkins` | `createCheckin()` | Créer check-in si validé |
| `members` | `updateMember()` | Mettre à jour last_scan_at |

---

## 📝 Journaux d'audit

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `audit_logs` | `getAuditLogs()` | Logs d'actions (table, action, actor, ts, payload) |

### Filtres disponibles

- Date : plage de dates
- Table : table concernée
- Utilisateur : actor

**Note** : Pas d'écriture directe (rempli automatiquement par triggers)

---

## 💼 Compta

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `outstanding_global` | `getOutstandingGlobal()` | Soldes & impayés globaux |
| `outstanding_balances` | `getTopOutstanding()` | Détail des impayés |
| `members_with_balance` | `getMembersWithBalance()` | Membres avec solde |
| `outstanding_by_discipline` | `getOutstandingByDiscipline()` | Impayés par discipline |
| `outstanding_by_plan` | `getOutstandingByPlan()` | Impayés par plan |
| `revenue_per_month` | `getRevenuePerMonth()` | Revenus mensuels |
| `revenue_monthly_12m` | Alternative | Revenus mensuels 12 mois |
| `kpi_bundle` | - | Bundle de KPIs |

### Tables (WRITE)

Aucune écriture directe (les écritures se font via Paiements).

### Export disponible

- CSV sur chaque tableau

---

## 📧 Notifications / Emails (section interne)

### Vues utilisées (READ)

| Vue | Fonction | Description |
|-----|----------|-------------|
| `email_outbox` | - | Boîte d'envoi |
| `email_logs` | - | Logs d'emails |
| `delivery_logs` | - | Logs de livraison |

### Tables (WRITE)

| Table | Fonctions | Actions |
|-------|-----------|---------|
| `outbound_messages` | - | Envoyer email/SMS |
| `notifications` | - | Programmer envoi |
| `message_templates` | - | Templates de messages |

---

## 🧩 Composants transverses

### Vues globales

| Vue | Usage | Description |
|-----|-------|-------------|
| `disciplines` | `getDisciplines()` | Sélecteur de discipline |
| `active_members_by_discipline` | `getActiveMembersByDiscipline()` | Distribution par discipline |
| `discipline_schedule_view` | - | Calendrier des cours |
| `org_settings` | - | Paramètres d'organisation |
| `v_fee_constants` | - | Constantes de frais |
| `v_first_card_already_paid` | - | Badge alerte carte |
| `v_insurance_paid_this_year` | - | Badge alerte assurance |

---

## 🔐 Règles d'écriture & validations

### Création abonnement

- Vérifier qu'aucun abonnement actif ne chevauche (`v_member_active_subscriptions`)
- Sinon demander confirmation "remplacer/pauser l'existant"

### Paiement

- `amount > 0`, `member_id` requis
- Après insert, rafraîchir `v_member_balance`

### Annulation abonnement

- Forcer `end_date = aujourd'hui` si vide

### Check-in

- Bloquer si membre non actif OU balance positive (impayé)
- Utiliser `validateMemberCheckin()` avant insertion

### Audit

- Toutes les mutations écrivent un audit (déjà géré par triggers)

---

## 📊 Résumé des vues par page

### Dashboard
- `v_dashboard_counts`
- `v_chart_revenue_12m`
- `v_chart_checkins_30d`
- `v_chart_subscriptions_status`
- `outstanding_balances`
- `audit_logs`

### Membres
- `members_directory_view`
- `v_member_status`
- `v_member_balance`
- `v_member_active_subscriptions`
- `active_members_by_discipline`

### Abonnements
- `subscriptions_directory_view`
- `subs_status_counts`
- `subs_expiring_7d`

### Paiements
- `payments_full_view` / `payments_directory_view`
- `revenue_per_month`
- `revenue_monthly_12m`

### Check-ins
- `v_chart_checkins_30d`

### Scan
- `v_member_status`
- `v_member_balance`

### Compta
- `outstanding_global`
- `outstanding_balances`
- `members_with_balance`
- `outstanding_by_plan`
- `outstanding_by_discipline`
- `revenue_per_month`
- `kpi_bundle`

---

## 🔄 Temps réel

### Channels actifs

1. **Check-ins** : `subscribeToCheckins(callback)`
   - Event : INSERT sur `checkins`
   - Usage : Affichage live dans Check-ins et Scan

2. **Notifications** (optionnel)
   - Channel notifications
   - Usage : Afficher envois terminés (`email_logs`, `delivery_logs`)

---

## 📤 Exports CSV/Excel

Toutes les pages avec listes peuvent exporter en CSV :

- Membres : `members_directory_view`
- Abonnements : `subscriptions_directory_view`
- Paiements : `payments_full_view`
- Impayés : `outstanding_balances`, `members_with_balance`
- Check-ins : `checkins`

**Important** : Respecter les colonnes déjà agrégées des vues ; ne pas re-composer côté client.

---

## ✅ Checklist d'implémentation

### READ (Vues)

- [x] `v_dashboard_counts` → Dashboard KPIs
- [x] `v_chart_revenue_12m` → Graphique revenus
- [x] `v_chart_checkins_30d` → Graphique check-ins
- [x] `v_chart_subscriptions_status` → Graphique abonnements
- [x] `outstanding_balances` → Top impayés
- [x] `audit_logs` → Activité récente
- [x] `members_directory_view` → Liste membres
- [x] `v_member_status` → Statut membre
- [x] `v_member_balance` → Solde membre
- [x] `v_member_active_subscriptions` → Abonnements actifs
- [x] `active_members_by_discipline` → Distribution disciplines
- [x] `subscriptions_directory_view` → Liste abonnements
- [x] `subs_status_counts` → Compteurs statuts
- [x] `subs_expiring_7d` → Abonnements expirant
- [x] `payments_full_view` → Liste paiements
- [x] `revenue_per_month` → Revenus mensuels
- [x] `outstanding_global` → Impayés globaux
- [x] `members_with_balance` → Membres avec solde
- [x] `outstanding_by_plan` → Impayés par plan
- [x] `outstanding_by_discipline` → Impayés par discipline

### WRITE (Tables)

- [x] `members` → CRUD membres
- [x] `member_disciplines` → Gérer disciplines
- [x] `subscriptions` → CRUD abonnements
- [x] `payments` → CRUD paiements
- [x] `receipts` → Générer reçus
- [x] `checkins` → Créer check-ins
- [x] `plans` → CRUD plans

### REALTIME

- [x] Check-ins → `subscribeToCheckins()`

---

## 🎯 Prochaines étapes

1. ✅ Fichier `supabaseQueries.ts` créé avec toutes les fonctions
2. ⏳ Mettre à jour chaque page pour utiliser les nouvelles fonctions
3. ⏳ Implémenter la pagination serveur
4. ⏳ Ajouter les toasters uniformes
5. ⏳ Implémenter le rollback si mutation échoue
6. ⏳ Tester toutes les pages avec données réelles

---

## 📞 Support

Ce document est maintenu à jour. Pour toute question sur le mapping des vues :

1. Consulter ce fichier
2. Voir `src/lib/supabaseQueries.ts` pour l'implémentation
3. Vérifier les vues dans Supabase Dashboard → Database → Views
