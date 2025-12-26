import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowUpDown, Download, Eye } from "lucide-react";
import { MemberDetailsModal } from "./MemberDetailsModal";
import { supabase } from "../../lib/supabaseClient"; // ✅ client partagé

type Row = {
  member_id: string;
  member_name: string;
  discipline: string | null;
  plan_name: string | null;
  subscription_status: "active" | "expired" | "upcoming" | null;
  starts_at: string | null;
  ends_at: string | null;
  days_remaining: number | null;
  last_payment_date: string | null;
  total_paid_eur: number | null;
  plan_price_eur: number | null;
  percent_paid: number | null;
  remaining_eur: number | null;
};

const PAGE_SIZE = 12;

export default function MembersTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [discipline, setDiscipline] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: keyof Row; dir: "asc" | "desc" } | null>(null);

  // ➕ état pour la modale de détails
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMemberId, setDetailsMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("members_directory_view")
      .select("*")
      .limit(10000);
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // ✅ rafraîchit sur paiements / abonnements / checkins
    const ch = supabase
      .channel("members-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, load)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "payments" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "subscriptions" }, load)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "subscriptions" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkins" }, load)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [load]);

  const allDisciplines = useMemo(
    () => ["all", ...Array.from(new Set(rows.map(r => r.discipline).filter(Boolean))) as string[]],
    [rows]
  );
  const allStatuses = useMemo(
    () => ["all", ...Array.from(new Set(rows.map(r => r.subscription_status).filter(Boolean))) as string[]],
    [rows]
  );

  const filtered = useMemo(() => {
    let m = rows;
    if (discipline !== "all") m = m.filter(r => r.discipline === discipline);
    if (status !== "all") m = m.filter(r => r.subscription_status === status);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      m = m.filter(r =>
        (r.member_name || "").toLowerCase().includes(qq) ||
        (r.plan_name || "").toLowerCase().includes(qq)
      );
    }
    if (sort) {
      const { key, dir } = sort;
      m = [...m].sort((a: any, b: any) => {
        const va = a[key]; const vb = b[key];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
        return dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return m;
  }, [rows, discipline, status, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [discipline, status, q]);

  const toggleSort = (key: keyof Row) => {
    setSort(prev => (!prev || prev.key !== key ? { key, dir: "asc" } : { key, dir: prev.dir === "asc" ? "desc" : "asc" }));
  };

  const exportCSV = () => {
    const header = [
      "Nom","Discipline","Plan","Statut","Début","Fin","Jours restants","Dernier paiement",
      "Payé (€)","Prix (€)","% payé","Reste (€)"
    ];
    const lines = filtered.map(r => [
      r.member_name,
      r.discipline ?? "",
      r.plan_name ?? "",
      r.subscription_status ?? "",
      r.starts_at ?? "",
      r.ends_at ?? "",
      r.days_remaining ?? "",
      r.last_payment_date ?? "",
      (r.total_paid_eur ?? 0).toFixed(2),
      (r.plan_price_eur ?? 0).toFixed(2),
      (r.percent_paid ?? 0).toFixed(1),
      (r.remaining_eur ?? 0).toFixed(2)
    ]);
    const csv = [header, ...lines].map(l => l.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch mb-4">
        <div className="flex gap-3 items-center">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Rechercher un membre / plan…"
            className="bg-white/10 text-white rounded-xl px-3 py-2 outline-none placeholder:text-slate-400"
          />
          <select value={discipline} onChange={(e)=>setDiscipline(e.target.value)} className="bg-white/10 text-white rounded-xl px-3 py-2">
            {allDisciplines.map(d => <option key={d} value={d}>{d === "all" ? "Toutes disciplines" : d}</option>)}
          </select>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="bg-white/10 text-white rounded-xl px-3 py-2">
            {allStatuses.map(s => <option key={s} value={s}>{s === "all" ? "Tous statuts" : s}</option>)}
          </select>
        </div>

        <button onClick={exportCSV} className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-white px-3 py-2 rounded-xl hover:bg-primary/30">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-300">
              <Th onClick={()=>toggleSort("member_name")}>Nom</Th>
              <Th onClick={()=>toggleSort("discipline")}>Discipline</Th>
              <Th onClick={()=>toggleSort("plan_name")}>Plan</Th>
              <Th onClick={()=>toggleSort("subscription_status")}>Statut</Th>
              <Th onClick={()=>toggleSort("last_payment_date")}>Dernier paiement</Th>
              <Th onClick={()=>toggleSort("total_paid_eur")}>Payé (€)</Th>
              <Th onClick={()=>toggleSort("plan_price_eur")}>Prix (€)</Th>
              <Th onClick={()=>toggleSort("percent_paid")}>% payé</Th>
              <Th onClick={()=>toggleSort("remaining_eur")}>Reste (€)</Th>
              <Th onClick={()=>toggleSort("days_remaining")}>Jours restants</Th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="py-10 text-center text-slate-400">Chargement…</td></tr>
            ) : pageData.length === 0 ? (
              <tr><td colSpan={11} className="py-10 text-center text-slate-400">Aucun membre</td></tr>
            ) : (
              pageData.map((r) => (
                <tr key={r.member_id} className="border-t border-white/10">
                  <td className="py-3 pr-4">{r.member_name}</td>
                  <td className="py-3 pr-4">{r.discipline ?? "-"}</td>
                  <td className="py-3 pr-4">{r.plan_name ?? "-"}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      r.subscription_status === "active" ? "bg-emerald-500/20 text-emerald-300"
                      : r.subscription_status === "upcoming" ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {r.subscription_status ?? "-"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{r.last_payment_date ? new Date(r.last_payment_date).toLocaleDateString("fr-BE") : "-"}</td>
                  <td className="py-3 pr-4">{(r.total_paid_eur ?? 0).toFixed(2)}</td>
                  <td className="py-3 pr-4">{(r.plan_price_eur ?? 0).toFixed(2)}</td>
                  <td className="py-3 pr-4">{(r.percent_paid ?? 0).toFixed(1)}%</td>
                  <td className="py-3 pr-4 font-medium">{(r.remaining_eur ?? 0).toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    {r.days_remaining === null ? "-" :
                      r.days_remaining === 0 ? <span className="text-rose-300 font-semibold">0</span> :
                      r.days_remaining < 5 ? <span className="text-amber-300 font-semibold">{r.days_remaining}</span> :
                      r.days_remaining}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-white hover:bg-white/15"
                      title="Voir / éditer"
                      onClick={() => { setDetailsMemberId(r.member_id); setDetailsOpen(true); }}
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        <button className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-40" onClick={()=>setPage(p => Math.max(1, p-1))} disabled={page<=1}>Précédent</button>
        <span className="text-slate-300 text-sm">Page {page} / {totalPages}</span>
        <button className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-40" onClick={()=>setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages}>Suivant</button>
      </div>

      {/* Modale de détails / édition complète */}
      <MemberDetailsModal
        memberId={detailsMemberId || undefined}   // ✅ garde TS content
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onChanged={() => {
          setDetailsOpen(false);
          load(); // refresh la table après modification
        }}
      />
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return (
    <th className="py-3 pr-4 cursor-pointer select-none" onClick={onClick}>
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-60" />
      </span>
    </th>
  );
}