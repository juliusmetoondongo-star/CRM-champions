// src/pages/Subscriptions.tsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { DISCIPLINES } from "../features/plans/catalog";

// Lignes renvoyées par subscriptions_directory_view
type SubscriptionRow = {
  subscription_id: string;
  member_id: string | null;
  member_name: string | null;
  discipline_slug: string | null;
  discipline_name: string | null;
  plan_id: string | null;
  plan_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: "active" | "expired" | "upcoming" | null;
};

type StatusFilter = "all" | "active" | "expired" | "upcoming";

interface SubscriptionsProps {
  refreshKey?: number;
  onDataChanged?: () => void;
}

export default function Subscriptions({ refreshKey = 0, onDataChanged }: SubscriptionsProps) {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtres
  const [slug, setSlug] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  // Utiliser les disciplines du catalogue au lieu de la base de données
  const disciplines = useMemo(() => {
    return DISCIPLINES.map((d) => ({
      slug: d.slug,
      name: d.title,
    }));
  }, []);

  // Charger les abonnements avec jointures
  async function load() {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Utiliser la vue subscriptions_directory_view qui mappe correctement les disciplines
      let q = supabase
        .from("subscriptions_directory_view")
        .select("*")
        .order("starts_at", { ascending: false, nullsLast: true })
        .limit(10000);

      // Filtre par discipline
      if (slug !== "all") {
        q = q.eq("discipline_slug", slug);
      }

      // Filtre par statut
      if (status !== "all") {
        q = q.eq("status", status);
      }

      const { data, error } = await q;

      if (error) throw error;

      // Les données sont déjà au bon format depuis la vue
      const transformed: SubscriptionRow[] = (data || []).map((sub: any) => ({
        subscription_id: sub.subscription_id,
        member_id: sub.member_id,
        member_name: sub.member_name,
        discipline_slug: sub.discipline_slug,
        discipline_name: sub.discipline_name,
        plan_id: sub.plan_id,
        plan_name: sub.plan_name,
        starts_at: sub.starts_at,
        ends_at: sub.ends_at,
        status: sub.status,
      }));

      // Le filtrage par discipline est déjà fait par la vue via discipline_slug
      setRows(transformed);

      console.log(`Subscriptions: Loaded ${transformed.length} subscriptions`);
    } catch (error: any) {
      console.error("Error loading subscriptions:", error);
      setRows([]);
      setErrorMsg("Impossible de charger les abonnements.");
    } finally {
      setLoading(false);
    }
  }

  // Rafraîchit sur changement de filtres + live updates
  useEffect(() => {
    load();

    const ch = supabase
      .channel("subs-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => load()
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [slug, status, refreshKey]);

  // Écouter les événements de refresh globaux
  useEffect(() => {
    const handleRefresh = () => load();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [slug, status]);

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-BE") : "—";

  const badgeClass = (s: SubscriptionRow["status"]) => {
    switch (s) {
      case "active":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "expired":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "upcoming":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Abonnements</h1>
          <p className="text-sm text-white/60">Liste filtrable</p>
        </div>

        <div className="flex gap-2">
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2.5 border border-white/10"
          >
            <option value="all">Disciplines</option>
            {disciplines.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2.5 border border-white/10"
          >
            <option value="all">Statuts</option>
            <option value="active">Actifs</option>
            <option value="upcoming">À venir</option>
            <option value="expired">Expirés</option>
          </select>
        </div>
      </header>

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="text-left p-3">Membre</th>
              <th className="text-left p-3">Discipline</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Début</th>
              <th className="text-left p-3">Fin</th>
              <th className="text-left p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : errorMsg ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-rose-300">
                  {errorMsg}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Aucun abonnement.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.subscription_id}
                  className="border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => r.member_id && window.history.pushState({}, '', `/members`)}
                  title="Cliquer pour voir tous les membres"
                >
                  <td className="p-3 text-white">{r.member_name || "—"}</td>
                  <td className="p-3 text-slate-300">{r.discipline_name || "—"}</td>
                  <td className="p-3 text-slate-300">{r.plan_name || "—"}</td>
                  <td className="p-3 text-slate-300">{fmtDate(r.starts_at)}</td>
                  <td className="p-3 text-slate-300">{fmtDate(r.ends_at)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${badgeClass(
                        r.status
                      )}`}
                    >
                      {r.status ?? "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            Chargement…
          </div>
        ) : errorMsg ? (
          <div className="py-12 text-center text-rose-300">
            {errorMsg}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Aucun abonnement.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.subscription_id}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white truncate">{r.member_name || "—"}</h3>
                  <p className="text-xs text-slate-400">{r.discipline_name || "—"}</p>
                </div>
                <span
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border ${badgeClass(r.status)}`}
                >
                  {r.status ?? "—"}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Plan:</span>
                  <span className="font-medium">{r.plan_name || "—"}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Début:</span>
                  <span>{fmtDate(r.starts_at)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Fin:</span>
                  <span>{fmtDate(r.ends_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}