import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Download, RefreshCcw } from "lucide-react";

type InsuranceStatus = "valid" | "expired" | "none";

type InsuranceRow = {
  member_id: string;
  member_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  insurance_expires_at: string | null;
  status: InsuranceStatus;
  days_remaining: number | null;
  last_payment_date: string | null;
};

export default function Insurances() {
  const [rows, setRows] = useState<InsuranceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      // Récupérer TOUS les membres avec pagination
      let allMembers: any[] = [];
      const BATCH_SIZE = 1000;
      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        const { data, error } = await supabase
          .from("members")
          .select("id, member_code, first_name, last_name, email, phone, insurance_expires_at")
          .order("last_name", { ascending: true })
          .range(offset, offset + BATCH_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allMembers = [...allMembers, ...data];
          offset += BATCH_SIZE;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      const members = allMembers;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Récupérer les derniers paiements d'assurance
      const { data: payments } = await supabase
        .from("payments")
        .select("member_id, paid_at")
        .eq("category", "insurance")
        .order("paid_at", { ascending: false });

      const lastPaymentMap = new Map<string, string>();
      if (payments) {
        payments.forEach((p) => {
          if (!lastPaymentMap.has(p.member_id)) {
            lastPaymentMap.set(p.member_id, p.paid_at);
          }
        });
      }

      const transformed: InsuranceRow[] = (members || []).map((m) => {
        let status: InsuranceStatus = "none";
        let daysRemaining: number | null = null;

        if (m.insurance_expires_at) {
          const expiryDate = new Date(m.insurance_expires_at);
          expiryDate.setHours(0, 0, 0, 0);
          const diffTime = expiryDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          status = daysRemaining >= 0 ? "valid" : "expired";
        }

        return {
          member_id: m.id,
          member_code: m.member_code,
          first_name: m.first_name,
          last_name: m.last_name,
          email: m.email,
          phone: m.phone,
          insurance_expires_at: m.insurance_expires_at,
          status,
          days_remaining: daysRemaining,
          last_payment_date: lastPaymentMap.get(m.id) || null,
        };
      });

      setRows(transformed);
    } catch (error) {
      console.error("Error loading insurances:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // Real-time updates
    const ch = supabase
      .channel("insurances-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, () => load())
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  // Écouter les événements de refresh globaux
  useEffect(() => {
    const handleRefresh = () => load();
    window.addEventListener("app-refresh", handleRefresh);
    return () => window.removeEventListener("app-refresh", handleRefresh);
  }, []);

  const filteredRows = useMemo(() => {
    let result = [...rows];

    // Filtre par statut
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const fullName = `${r.first_name || ""} ${r.last_name || ""}`.toLowerCase();
        const code = (r.member_code || "").toLowerCase();
        const email = (r.email || "").toLowerCase();
        return fullName.includes(query) || code.includes(query) || email.includes(query);
      });
    }

    return result;
  }, [rows, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.status === "valid").length;
    const expired = rows.filter((r) => r.status === "expired").length;
    const none = rows.filter((r) => r.status === "none").length;
    return { valid, expired, none, total: rows.length };
  }, [rows]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-BE");
  }

  function getStatusBadge(status: InsuranceStatus, daysRemaining: number | null) {
    if (status === "valid") {
      const isUrgent = daysRemaining !== null && daysRemaining <= 30;
      return (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium ${
            isUrgent
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
          }`}
        >
          Valide {daysRemaining !== null && `(${daysRemaining}j)`}
        </span>
      );
    } else if (status === "expired") {
      return (
        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40">
          Expirée
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-500/20 text-slate-300 border border-slate-500/40">
          Aucune
        </span>
      );
    }
  }

  function exportCSV() {
    const headers = ["Code", "Prénom", "Nom", "Email", "Téléphone", "Statut", "Expire le", "Jours restants", "Dernier paiement"];
    const lines = [
      headers.join(","),
      ...filteredRows.map((r) =>
        [
          r.member_code ?? "",
          r.first_name ?? "",
          r.last_name ?? "",
          r.email ?? "",
          r.phone ?? "",
          r.status,
          r.insurance_expires_at ? formatDate(r.insurance_expires_at) : "",
          r.days_remaining ?? "",
          r.last_payment_date ? formatDate(r.last_payment_date) : "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `assurances_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Assurances</h1>
          <p className="text-muted">Gestion des assurances des membres</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F2548]/40 hover:bg-[#0F2548]/60 text-white transition"
          >
            <RefreshCcw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={exportCSV}
            disabled={!filteredRows.length}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#142D5B] border border-[#0F2548]/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted">Valides</p>
              <p className="text-2xl font-bold text-white">{stats.valid}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#142D5B] border border-[#0F2548]/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-muted">Expirées</p>
              <p className="text-2xl font-bold text-white">{stats.expired}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#142D5B] border border-[#0F2548]/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500/20 rounded-xl">
              <ShieldX className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-muted">Aucune</p>
              <p className="text-2xl font-bold text-white">{stats.none}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#142D5B] border border-[#0F2548]/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted">Total membres</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-[#142D5B] border border-[#0F2548]/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Rechercher par nom, code, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-[#0F2548] text-white rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#0F2548] text-white rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="valid">Valides</option>
            <option value="expired">Expirées</option>
            <option value="none">Aucune assurance</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-[#142D5B] border border-[#0F2548]/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0F2548] text-white/80">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Membre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Expire le</th>
                <th className="px-4 py-3 text-left">Dernier paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-white/70 text-center" colSpan={7}>
                    Chargement…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/60 text-center" colSpan={7}>
                    Aucun membre trouvé
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr
                    key={r.member_id}
                    className="hover:bg-[#173263] transition-colors cursor-pointer"
                    onClick={() => window.history.pushState({}, "", `/members`)}
                    title="Cliquer pour voir tous les membres"
                  >
                    <td className="px-4 py-3 text-white/90 font-mono text-xs">{r.member_code || "—"}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-3 text-white/80">{r.email || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.phone || "—"}</td>
                    <td className="px-4 py-3">{getStatusBadge(r.status, r.days_remaining)}</td>
                    <td className="px-4 py-3 text-white/80">{formatDate(r.insurance_expires_at)}</td>
                    <td className="px-4 py-3 text-white/80">{formatDate(r.last_payment_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#142D5B] border border-[#0F2548]/20 rounded-xl p-4">
        <p className="text-slate-300 text-sm">
          <strong className="text-white">Note :</strong> Les assurances expirées doivent être renouvelées pour que le
          membre puisse continuer à pratiquer. Le tarif annuel est de 40€.
        </p>
      </div>
    </div>
  );
}
