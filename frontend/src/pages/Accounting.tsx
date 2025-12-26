// src/pages/Accounting.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Download, Filter, RefreshCcw, Lock } from "lucide-react";

type Row = {
  payment_id: string;
  paid_at: string;
  amount_eur: number;
  currency: string;
  method: string | null;
  status: string;
  memo: string | null;
  subscription_id: string | null;
  member_id: string | null;
  member_name: string | null;
  member_email: string | null;
  member_code: string | null;
  plan_name: string | null;
  discipline: string | null;
  product_code: string | null;
};

export function Accounting() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10); // 1er du mois
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // aujourd'hui
  });
  const [method, setMethod] = useState<string>("");

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.amount_eur) || 0), 0),
    [rows]
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // Lecture de la vue sécurisée
      let query = supabase
        .from("accounting_journal")
        .select("*")
        .order("paid_at", { ascending: false })
        .limit(10000);

      if (from) query = query.gte("paid_at", from);
      if (to) query = query.lte("paid_at", `${to} 23:59:59`);
      if (method) query = query.eq("method", method);

      const { data, error, status } = await query;
      if (error) {
        // Si RLS admin bloque : message dédié
        if (status === 401 || status === 403) {
          setErr(
            "Accès refusé. Cet onglet est réservé aux administrateurs (profiles.is_admin = true)."
          );
        } else {
          setErr(error.message);
        }
        setRows([]);
        return;
      }
      setRows((data || []) as Row[]);
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // live refresh sur nouveaux paiements
    const ch = supabase
      .channel("accounting-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payments" },
        () => load()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // Écouter les événements de refresh globaux
  useEffect(() => {
    const handleRefresh = () => load();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [from, to, method]);

  function exportCSV() {
    const headers = [
      "paid_at",
      "amount_eur",
      "method",
      "member_name",
      "member_email",
      "plan_name",
      "discipline",
      "payment_id",
      "subscription_id",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.paid_at,
          String(r.amount_eur).replace(".", ","),
          r.method ?? "",
          (r.member_name ?? "").replace(/[,;\n]/g, " "),
          r.member_email ?? "",
          (r.plan_name ?? "").replace(/[,;\n]/g, " "),
          r.discipline ?? "",
          r.payment_id,
          r.subscription_id,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `journal_compta_${from}_au_${to}_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Comptabilité</h1>
          <p className="text-muted">
            Journal des encaissements (lecture de <code>accounting_journal</code>)
          </p>
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
            disabled={!rows.length}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#142D5B] p-4 rounded-xl border border-[#0F2548]/20">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-300/70 mb-1">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg bg-[#0F2548] text-white px-3 py-2 border border-white/10"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-300/70 mb-1">Au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg bg-[#0F2548] text-white px-3 py-2 border border-white/10"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-300/70 mb-1">Méthode</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-lg bg-[#0F2548] text-white px-3 py-2 border border-white/10"
          >
            <option value="">Toutes</option>
            <option value="cash">Cash</option>
            <option value="card">Carte</option>
            <option value="transfer">Virement</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 w-full px-4 py-2 rounded-xl bg-[#0F2548]/40 hover:bg-[#0F2548]/60 text-white transition"
          >
            <Filter className="w-4 h-4" />
            Filtrer
          </button>
        </div>
      </div>

      {/* Totaux */}
      <div className="bg-[#142D5B] p-4 rounded-xl border border-[#0F2548]/20">
        <p className="text-white">
          Total encaissements :{" "}
          <b>
            {new Intl.NumberFormat("fr-BE", {
              style: "currency",
              currency: "EUR",
            }).format(total)}
          </b>{" "}
          ({rows.length} ligne{rows.length > 1 ? "s" : ""})
        </p>
      </div>

      {/* Erreur / RLS admin */}
      {err && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <b>Accès restreint</b>
          </div>
          <p className="mt-1">{err}</p>
        </div>
      )}

      {/* Tableau */}
      {!err && (
        <div className="overflow-auto rounded-xl border border-[#0F2548]/20">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0F2548] text-white/80">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Membre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Discipline</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-left">Méthode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-white/70" colSpan={7}>
                    Chargement…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={7}>
                    Aucune donnée pour la période sélectionnée.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.payment_id} className="bg-[#142D5B] hover:bg-[#173263]">
                    <td className="px-4 py-3 text-white/90">
                      {new Date(r.paid_at).toLocaleString("fr-BE")}
                    </td>
                    <td className="px-4 py-3 text-white">{r.member_name ?? "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.member_email ?? "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.discipline ?? "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.plan_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-white">
                      {new Intl.NumberFormat("fr-BE", {
                        style: "currency",
                        currency: "EUR",
                      }).format(Number(r.amount_eur) || 0)}
                    </td>
                    <td className="px-4 py-3 text-white/80">{r.method ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}