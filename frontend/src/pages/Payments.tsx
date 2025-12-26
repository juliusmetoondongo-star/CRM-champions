// src/pages/Payments.tsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import type { PaymentDirectoryRow } from "../lib/types";
import { fetchPaymentsDirectory } from "../lib/data";
import { DISCIPLINES } from "../features/plans/catalog";

type Method = "all" | "cash" | "carte" | "virement";

const METHODS: { v: Method; label: string }[] = [
  { v: "all", label: "Toutes les méthodes" },
  { v: "cash", label: "cash" },
  { v: "carte", label: "carte" },
  { v: "virement", label: "virement" },
];

export default function Payments() {
  const [rows, setRows] = useState<PaymentDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string>("all");
  const [method, setMethod] = useState<Method>("all");

  // Utiliser les disciplines du catalogue au lieu de la base de données
  const disciplines = useMemo(() => {
    return DISCIPLINES.map((d) => ({
      slug: d.slug,
      name: d.title,
    }));
  }, []);

  // Charge la vue normalisée
  async function load() {
    setLoading(true);
    try {
      const data = await fetchPaymentsDirectory({
        disciplineSlug: slug,
        method,
        limit: 10000,
      });
      setRows(data);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Rafraîchit au changement de filtres + live updates
  useEffect(() => {
    load();
    const ch = supabase
      .channel("payments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => load()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [slug, method]); // re-load quand filtre change

  // Écouter les événements de refresh globaux
  useEffect(() => {
    const handleRefresh = () => load();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [slug, method]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Paiements</h1>
        <p className="text-slate-300">Historique filtrable par discipline et méthode.</p>
      </header>

      {/* Filtres */}
      <div className="flex gap-3">
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="bg-[#142D5B] text-white text-sm rounded-xl px-3 py-2 border border-white/10"
        >
          <option value="all">Toutes les disciplines</option>
          {disciplines.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className="bg-[#142D5B] text-white text-sm rounded-xl px-3 py-2 border border-white/10"
        >
          {METHODS.map((m) => (
            <option key={m.v} value={m.v}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Membre</th>
              <th className="text-left p-3">Discipline</th>
              <th className="text-left p-3">Montant</th>
              <th className="text-left p-3">Méthode</th>
              <th className="text-left p-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Aucun paiement.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const when = r.paid_at
                  ? new Date(r.paid_at).toLocaleString("fr-BE")
                  : "—";
                const amount =
                  typeof r.amount_eur === "number"
                    ? new Intl.NumberFormat("fr-BE", {
                        style: "currency",
                        currency: (r.currency || "EUR").toUpperCase(),
                      }).format(r.amount_eur)
                    : "—";
                return (
                  <tr
                    key={r.payment_id ?? `${r.member_id}-${r.paid_at}`}
                    className="border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => r.member_id && window.history.pushState({}, '', `/members`)}
                    title="Cliquer pour voir tous les membres"
                  >
                    <td className="p-3 text-white">{when}</td>
                    <td className="p-3 text-white">{r.member_name || "—"}</td>
                    <td className="p-3 text-slate-300">{r.discipline_name || "—"}</td>
                    <td className="p-3 text-white">{amount}</td>
                    <td className="p-3 text-slate-300">{r.method || "—"}</td>
                    <td className="p-3 text-slate-300">{r.memo || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}