import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PieRow = { discipline: string; active_members: number };
type KPI = { active_members: number; revenue_mtd: number; remaining_due: number; nb_in_arrears: number };

const COLORS = ["#ef4444","#3b82f6","#10b981","#f59e0b","#a855f7","#06b6d4","#84cc16"];

export default function ChampionsDashboard() {
  const [pie, setPie] = useState<PieRow[]>([]);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pieRes, kpiRes] = await Promise.all([
      supabase.from("active_members_by_discipline").select("*"),
      supabase.from("kpi_bundle").select("*").single()
    ]);
    if (!pieRes.error && pieRes.data) setPie(pieRes.data as PieRow[]);
    if (!kpiRes.error && kpiRes.data) setKpi(kpiRes.data as KPI);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const ch = supabase
      .channel("champions-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, loadData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "subscriptions" }, loadData)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [loadData]);

  return (
    <div className="w-full grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* KPI Cards */}
      <div className="xl:col-span-1 grid grid-cols-2 gap-4">
        <KpiCard title="Membres actifs" value={kpi?.active_members ?? 0} />
        <KpiCard title="CA mois (EUR)" value={(kpi?.revenue_mtd ?? 0).toFixed(2)} />
        <KpiCard title="Reste à payer (EUR)" value={(kpi?.remaining_due ?? 0).toFixed(2)} trend="warn" />
        <KpiCard title="Abonnements en retard" value={kpi?.nb_in_arrears ?? 0} trend="warn" />
      </div>

      {/* Pie */}
      <div className="xl:col-span-2 bg-white rounded-2xl shadow p-5">
        <h3 className="text-lg font-semibold mb-4">Membres actifs par discipline</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">Chargement…</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie data={pie} dataKey="active_members" nameKey="discipline" outerRadius={120} label>
                {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend }: { title: string; value: any; trend?: "warn" | "ok" }) {
  return (
    <div className={`rounded-2xl shadow p-4 bg-white border ${trend==="warn" ? "border-red-200" : "border-gray-100"}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}