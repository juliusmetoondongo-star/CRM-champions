# Guide d'implémentation - ClubManager CRM

Ce fichier contient des prompts prêts à l'emploi pour compléter l'application avec les fonctionnalités manquantes.

## 📋 Architecture actuelle

**Composants UI disponibles :**
- `src/components/ui/Skeleton.tsx` - États de chargement
- `src/components/ui/Toast.tsx` + `src/hooks/useToast.ts` - Notifications
- `src/components/ui/Dialog.tsx` - Modales
- `src/components/ui/Toolbar.tsx` - Barre d'outils avec filtres
- `src/components/ui/Card.tsx`, `Button.tsx`, `Input.tsx`, `Table.tsx`

**Utilitaires :**
- `src/utils/exportCsv.ts` - Export CSV
- `src/features/realtime/useCheckinsRealtime.ts` - Realtime check-ins

**Pages existantes :**
- Dashboard, Members, Subscriptions, Payments, Checkins, AuditLogs, Scan, Notifications

---

## 🎯 Prompt 1 : Ajouter filtres et recherche sur Members

```
Ajoute des filtres et une recherche sur la page Members (src/pages/Members.tsx) :

1. Imports nécessaires :
import { Toolbar, ToolbarSection, SearchInput, FilterPill, SelectFilter, ExportButton } from "../components/ui/Toolbar";
import { exportToCsv } from "../utils/exportCsv";
import { useToast } from "../hooks/useToast";

2. États à ajouter :
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState<string>("all");
const [sortBy, setSortBy] = useState<string>("last_scan");
const { toast } = useToast();

3. Filtrage client-side (après le fetch des données) :
const filteredMembers = useMemo(() => {
  return members.filter(m => {
    const matchesSearch = !searchQuery ||
      m.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "last_scan") {
      return new Date(b.last_scan_at || 0).getTime() - new Date(a.last_scan_at || 0).getTime();
    }
    return 0;
  });
}, [members, searchQuery, statusFilter, sortBy]);

4. Toolbar à placer avant le tableau :
<Toolbar>
  <ToolbarSection>
    <SearchInput
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder="Rechercher un membre..."
    />
    <FilterPill label="Tous" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
    <FilterPill label="Actif" active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
    <FilterPill label="Inactif" active={statusFilter === "inactive"} onClick={() => setStatusFilter("inactive")} />
    <FilterPill label="Suspendu" active={statusFilter === "suspended"} onClick={() => setStatusFilter("suspended")} />
  </ToolbarSection>
  <ToolbarSection>
    <SelectFilter
      value={sortBy}
      onChange={setSortBy}
      options={[
        { value: "last_scan", label: "Dernier scan" },
        { value: "name", label: "Nom" },
        { value: "created", label: "Date création" }
      ]}
    />
    <ExportButton onClick={() => {
      exportToCsv("members", filteredMembers, ["member_code", "first_name", "last_name", "email", "status"]);
      toast.success("Export CSV réussi !");
    }} />
  </ToolbarSection>
</Toolbar>

5. Remplace `members.map()` par `filteredMembers.map()` dans le tableau.

6. Ajoute un indicateur de résultats :
<p className="text-sm text-white/60 mb-4">
  {filteredMembers.length} résultat{filteredMembers.length > 1 ? "s" : ""}
  {searchQuery && ` pour "${searchQuery}"`}
</p>
```

---

## 🎯 Prompt 2 : Ajouter filtres sur Subscriptions

```
Ajoute des filtres sur la page Subscriptions (src/pages/Subscriptions.tsx) :

1. Imports :
import { Toolbar, ToolbarSection, FilterPill, SelectFilter, ExportButton } from "../components/ui/Toolbar";
import { exportToCsv } from "../utils/exportCsv";
import { useToast } from "../hooks/useToast";

2. États :
const [statusFilter, setStatusFilter] = useState<string>("all");
const [expiringFilter, setExpiringFilter] = useState<string>("all");
const { toast } = useToast();

3. Filtrage :
const filteredSubs = useMemo(() => {
  const now = new Date();
  return subscriptions.filter(s => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;

    let matchesExpiring = true;
    if (expiringFilter === "7days") {
      const diff = new Date(s.ends_at).getTime() - now.getTime();
      matchesExpiring = diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
    } else if (expiringFilter === "30days") {
      const diff = new Date(s.ends_at).getTime() - now.getTime();
      matchesExpiring = diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    }

    return matchesStatus && matchesExpiring;
  });
}, [subscriptions, statusFilter, expiringFilter]);

4. Toolbar :
<Toolbar>
  <ToolbarSection>
    <FilterPill label="Tous" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
    <FilterPill label="Actif" active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
    <FilterPill label="Expiré" active={statusFilter === "expired"} onClick={() => setStatusFilter("expired")} />
    <FilterPill label="Suspendu" active={statusFilter === "suspended"} onClick={() => setStatusFilter("suspended")} />
  </ToolbarSection>
  <ToolbarSection>
    <SelectFilter
      value={expiringFilter}
      onChange={setExpiringFilter}
      options={[
        { value: "all", label: "Toutes dates" },
        { value: "7days", label: "Expire < 7j" },
        { value: "30days", label: "Expire < 30j" }
      ]}
    />
    <ExportButton onClick={() => {
      exportToCsv("subscriptions", filteredSubs);
      toast.success("Export réussi !");
    }} />
  </ToolbarSection>
</Toolbar>
```

---

## 🎯 Prompt 3 : Intégrer Realtime check-ins dans Dashboard

```
Intègre les check-ins en temps réel dans le Dashboard (src/pages/Dashboard.tsx) :

1. Imports :
import { useCheckinsRealtime } from "../features/realtime/useCheckinsRealtime";
import { useToast } from "../hooks/useToast";

2. Dans le composant Dashboard, après les autres hooks :
const { toast } = useToast();

useCheckinsRealtime((newCheckin) => {
  toast.success("Nouveau check-in !");
  loadData(); // Recharge les données du dashboard
});

3. Alternative plus optimisée (sans tout recharger) :
useCheckinsRealtime((newCheckin) => {
  toast.success("Nouveau check-in !");

  // Met à jour seulement les stats concernées
  setStats(prev => ({
    ...prev,
    todayCheckins: prev.todayCheckins + 1
  }));

  // Ajoute au graphique des 30 derniers jours si besoin
  // ...
});
```

---

## 🎯 Prompt 4 : Créer modal CRUD pour Members

```
Crée un modal d'édition de membre (src/features/members/MemberEditModal.tsx) :

1. Structure du fichier :
import { useState } from "react";
import { Dialog, DialogBody, DialogFooter } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";

interface MemberEditModalProps {
  open: boolean;
  onClose: () => void;
  member: any | null;
  onSuccess: () => void;
}

export function MemberEditModal({ open, onClose, member, onSuccess }: MemberEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: member?.first_name || "",
    last_name: member?.last_name || "",
    email: member?.email || "",
    phone: member?.phone || "",
    status: member?.status || "active",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (member) {
        await supabase.from("members").update(formData).eq("id", member.id);
      } else {
        await supabase.from("members").insert([{ ...formData, member_code: `M${Date.now()}` }]);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={member ? "Modifier membre" : "Nouveau membre"}>
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="space-y-4">
            <Input label="Prénom" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
            <Input label="Nom" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            <Input label="Téléphone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-[#0F2548] border border-white/10 rounded-xl text-white">
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="suspended">Suspendu</option>
            </select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Enregistrer</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

2. Utilisation dans Members.tsx :
import { MemberEditModal } from "../features/members/MemberEditModal";

// États
const [editModalOpen, setEditModalOpen] = useState(false);
const [selectedMember, setSelectedMember] = useState<any>(null);

// Bouton "Nouveau membre"
<Button onClick={() => { setSelectedMember(null); setEditModalOpen(true); }}>
  Nouveau membre
</Button>

// Modal
<MemberEditModal
  open={editModalOpen}
  onClose={() => setEditModalOpen(false)}
  member={selectedMember}
  onSuccess={loadMembers}
/>
```

---

## 🎯 Prompt 5 : Ajouter pagination à une table

```
Ajoute la pagination à un tableau (exemple Members) :

1. États :
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(50);

2. Calcul :
const totalPages = Math.ceil(filteredMembers.length / pageSize);
const paginatedMembers = filteredMembers.slice(
  (currentPage - 1) * pageSize,
  currentPage * pageSize
);

3. UI (après le tableau) :
<div className="flex items-center justify-between mt-6 px-4">
  <div className="flex items-center gap-2">
    <span className="text-sm text-white/60">Lignes par page :</span>
    <select
      value={pageSize}
      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
      className="px-3 py-1 bg-[#0F2548] border border-white/10 rounded-lg text-white text-sm"
    >
      <option value="50">50</option>
      <option value="100">100</option>
      <option value="200">200</option>
    </select>
  </div>

  <div className="flex items-center gap-2">
    <Button
      variant="secondary"
      size="sm"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage(p => p - 1)}
    >
      Précédent
    </Button>
    <span className="text-sm text-white/60">
      Page {currentPage} sur {totalPages}
    </span>
    <Button
      variant="secondary"
      size="sm"
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage(p => p + 1)}
    >
      Suivant
    </Button>
  </div>
</div>

4. Remplace `filteredMembers.map()` par `paginatedMembers.map()`.
```

---

## 🎯 Prompt 6 : Créer page Health Check

```
Crée une page Health Check (src/pages/HealthCheck.tsx) :

import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface HealthCheck {
  name: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export function HealthCheck() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: "Supabase Connection", status: "pending" },
    { name: "Database Tables", status: "pending" },
    { name: "RPC Functions", status: "pending" },
    { name: "Realtime Connection", status: "pending" },
  ]);

  async function runChecks() {
    // Reset
    setChecks(prev => prev.map(c => ({ ...c, status: "pending" })));

    // Check 1: Supabase connection
    try {
      const { data, error } = await supabase.from("members").select("id").limit(1);
      updateCheck("Supabase Connection", error ? "error" : "success", error?.message);
    } catch (err) {
      updateCheck("Supabase Connection", "error", String(err));
    }

    // Check 2: Database tables
    try {
      await Promise.all([
        supabase.from("members").select("id").limit(1),
        supabase.from("subscriptions").select("id").limit(1),
        supabase.from("payments").select("id").limit(1),
        supabase.from("checkins").select("id").limit(1),
      ]);
      updateCheck("Database Tables", "success");
    } catch (err) {
      updateCheck("Database Tables", "error", String(err));
    }

    // Check 3: RPC functions
    try {
      await supabase.rpc("daily_checkins_30d");
      updateCheck("RPC Functions", "success");
    } catch (err) {
      updateCheck("RPC Functions", "error", String(err));
    }

    // Check 4: Realtime
    try {
      const channel = supabase.channel("health-test").subscribe();
      updateCheck("Realtime Connection", "success");
      supabase.removeChannel(channel);
    } catch (err) {
      updateCheck("Realtime Connection", "error", String(err));
    }
  }

  function updateCheck(name: string, status: "success" | "error", message?: string) {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, status, message } : c));
  }

  useEffect(() => {
    runChecks();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Health Check</h1>
        <p className="text-white/60">État de santé de l'application</p>
      </div>

      <Card variant="glass">
        <div className="p-6 space-y-4">
          {checks.map((check) => (
            <div key={check.name} className="flex items-center justify-between">
              <span className="text-white">{check.name}</span>
              <div className="flex items-center gap-2">
                {check.status === "pending" && <Loader className="w-5 h-5 text-white/40 animate-spin" />}
                {check.status === "success" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {check.status === "error" && <XCircle className="w-5 h-5 text-red-400" />}
                {check.message && <span className="text-xs text-white/60">{check.message}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <Button onClick={runChecks} fullWidth>
            Relancer les tests
          </Button>
        </div>
      </Card>

      <Card variant="glass">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Supabase URL</span>
              <span className="text-white">{import.meta.env.VITE_SUPABASE_URL ? "✓" : "✗"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Supabase Key</span>
              <span className="text-white">{import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓" : "✗"}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

Ajoute la route dans App.tsx :
- Importe HealthCheck
- Ajoute au menu : { path: "/health", label: "Health", icon: Activity }
- Ajoute dans le main : {currentPath === "/health" && <HealthCheck />}
```

---

## 🎯 Prompt 7 : Ajouter états de chargement avec Skeleton

```
Remplace les états de chargement basiques par des Skeletons :

1. Dans Dashboard.tsx, remplace :
if (loading) return <Loading />;

Par :
if (loading) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

2. Dans les pages avec tableaux (Members, Payments, etc.), remplace le loading par :
if (loading) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <SkeletonTable rows={10} />
    </div>
  );
}

Import nécessaire :
import { Skeleton, SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";
```

---

## 🔧 Checklist complète d'implémentation

### UI & UX
- [ ] Skeletons sur toutes les pages (Dashboard, Members, Subscriptions, Payments, Checkins)
- [ ] Toast pour toutes les actions (success/error)
- [ ] Filtres + recherche sur Members
- [ ] Filtres sur Subscriptions (status + expiring)
- [ ] Filtres sur Payments (période + méthode + statut)
- [ ] Filtres sur Checkins (date range + source)
- [ ] Export CSV sur tous les tableaux
- [ ] Pagination (50/100/200) sur tous les tableaux

### Realtime
- [ ] Hook useCheckinsRealtime intégré dans Dashboard
- [ ] Hook useCheckinsRealtime intégré dans Scan
- [ ] Toast "Nouveau check-in" quand insertion
- [ ] Refresh automatique des KPIs après check-in

### CRUD
- [ ] Modal MemberEditModal (create/update)
- [ ] Modal SubscriptionEditModal
- [ ] Modal PaymentCreateModal
- [ ] Modal CheckinCreateModal
- [ ] Actions rapides : "Prolonger 1 mois", "Suspendre", etc.
- [ ] Validations formulaires
- [ ] Gestion erreurs avec Toast

### Pages système
- [ ] Page /health avec tests automatiques
- [ ] Diagnostic panel (Ctrl+Alt+D) avec env vars
- [ ] Page 404
- [ ] Logs front (utils/log.ts)

### Polish
- [ ] Tous les boutons ont un état loading
- [ ] Tous les formulaires ont un bouton "Annuler"
- [ ] Toutes les modales ferment sur Escape
- [ ] Animations cohérentes (fade-in, slide-up)
- [ ] Focus rings visibles partout
- [ ] Messages d'erreur clairs

---

## 💡 Best Practices

**1. Toujours utiliser le Toast pour feedback utilisateur :**
```typescript
const { toast } = useToast();
toast.success("Action réussie !");
toast.error("Erreur lors de l'opération");
```

**2. Wrapper les requêtes Supabase dans try/catch :**
```typescript
try {
  const { data, error } = await supabase.from("table").select();
  if (error) throw error;
  toast.success("Données chargées");
} catch (err) {
  toast.error("Erreur de chargement");
}
```

**3. Toujours afficher un Skeleton pendant le chargement initial**

**4. Valider les formulaires avant envoi**

**5. Utiliser useMemo pour les filtres côté client**

**6. Exporter uniquement les colonnes pertinentes en CSV**
