// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Loading } from "../components/ui/Loading";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Activity, Users, TrendingUp, DollarSign, ArrowUpDown, Download, Plus } from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import { MemberCreateModal } from "../features/members/MemberCreateModal";
import { createMissingSubscriptions } from "../lib/subscriptionHelper";

// ✅ Import namespace pour éviter tout mismatch d'exports
import * as Q from "../lib/supabaseQueries";

const DISCIPLINE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#84cc16"];

type PieRow = { discipline: string; active_members: number };

interface DashboardProps {
  refreshKey?: number;
}

function getTodayBoundsISO() {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

/** ✅ UNE SEULE DÉFINITION + export par défaut */
export default function Dashboard({ refreshKey = 0 }: DashboardProps) {
  const [loading, setLoading] = useState(true);

  const [checkins, setCheckins] = useState<{label:string; value:number}[]>([]);
  const [pieRows, setPieRows] = useState<PieRow[]>([]);
  const [revenue, setRevenue] = useState<{ month: string; value: number }[]>([]);
  const [stats, setStats] = useState({
    activeMembers: 0,
    inactiveMembers: 0,
    todayCheckins: 0,
    monthlyRevenue: 0,
    memberGrowth: 0,
    checkinGrowth: 0,
    revenueGrowth: 0,
    remainingDue: 0,
    nbInArrears: 0,
  });

  const [openCreate, setOpenCreate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pieRes, revRes, kpi] = await Promise.all([
        (Q.getCheckinsChart30Days?.() ?? Promise.resolve([])).catch(() => []),
        (Q.getActiveMembersByDiscipline?.() ?? Promise.resolve([])).catch(() => []),
        (Q.getRevenueChart12Months?.() ?? Promise.resolve([])).catch(() => []),
        (Q.getDashboardCounts?.() ?? Promise.resolve({})).catch(() => ({})),
      ]);

      setCheckins(Array.isArray(cRes) ? cRes : []);
      setPieRows(Array.isArray(pieRes) ? (pieRes as PieRow[]) : []);
      setRevenue(Array.isArray(revRes) ? revRes : []);

      let todayCheckins = Number((kpi as any)?.today_checkins ?? 0);
      if (!todayCheckins && supabase) {
        const { startISO, endISO } = getTodayBoundsISO();
        const todayCountReq = await supabase
          .from("checkins")
          .select("*", { count: "exact", head: true })
          .gte("scanned_at", startISO)
          .lt("scanned_at", endISO);
        todayCheckins = todayCountReq.count ?? 0;
      }

      // Compter les membres inactifs
      let inactiveMembers = 0;
      if (supabase) {
        const { count } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("status", "inactive");
        inactiveMembers = count || 0;
      }

      let memberGrowth = 0;
      let checkinGrowth = 0;
      let revenueGrowth = 0;

      if (supabase) {
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const { count: lastMonthActive } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .lt("created_at", thisMonthStart.toISOString());

        const currentActive = Number((kpi as any)?.active_members ?? 0);
        if (lastMonthActive && lastMonthActive > 0) {
          memberGrowth = Math.round(((currentActive - lastMonthActive) / lastMonthActive) * 100);
        }

        // Croissance des check-ins (comparaison hier vs aujourd'hui)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        const { count: yesterdayCheckins } = await supabase
          .from("checkins")
          .select("*", { count: "exact", head: true })
          .gte("scanned_at", yesterday.toISOString())
          .lte("scanned_at", yesterdayEnd.toISOString());

        if (yesterdayCheckins && yesterdayCheckins > 0 && todayCheckins > 0) {
          checkinGrowth = Math.round(((todayCheckins - yesterdayCheckins) / yesterdayCheckins) * 100);
        }

        // Croissance des revenus (comparaison mois dernier)
        const lastMonthEnd = new Date(thisMonthStart);
        lastMonthEnd.setDate(0);
        lastMonthEnd.setHours(23, 59, 59, 999);

        const lastMonthStart = new Date(lastMonthEnd);
        lastMonthStart.setDate(1);
        lastMonthStart.setHours(0, 0, 0, 0);

        const { data: lastMonthPayments } = await supabase
          .from("payments")
          .select("amount_cents")
          .gte("paid_at", lastMonthStart.toISOString())
          .lte("paid_at", lastMonthEnd.toISOString());

        const lastMonthRevenue = lastMonthPayments?.reduce((sum, p) => sum + (Number(p.amount_cents) || 0), 0) / 100 || 0;
        const currentRevenue = Number((kpi as any)?.revenue_mtd ?? 0);

        if (lastMonthRevenue > 0 && currentRevenue > 0) {
          revenueGrowth = Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
        }
      }

      setStats((prev) => ({
        ...prev,
        activeMembers:  Number((kpi as any)?.active_members ?? 0),
        inactiveMembers,
        monthlyRevenue: Number((kpi as any)?.revenue_mtd ?? 0),
        remainingDue:   Number((kpi as any)?.remaining_due ?? 0),
        nbInArrears:    Number((kpi as any)?.nb_in_arrears ?? 0),
        todayCheckins,
        memberGrowth,
        checkinGrowth,
        revenueGrowth,
      }));
    } catch (e) {
      console.error("Error loading dashboard data:", e);
      setCheckins([]); setPieRows([]); setRevenue([]);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    loadData();

    // 🔴 Temps réel safe
    let unsubscribe: (() => void) | undefined;
    try {
      if (Q.subscribeToCheckins) {
        unsubscribe = Q.subscribeToCheckins(() => loadData());
      } else if (supabase) {
        const ch = supabase
          .channel("dashboard-live")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkins" }, loadData)
          .subscribe();
        unsubscribe = () => supabase.removeChannel(ch);
      }
    } catch (e) {
      console.warn("Realtime disabled:", e);
    }

    // Paiements / Abonnements
    let ch2: any;
    try {
      if (supabase) {
        ch2 = supabase
          .channel("dashboard-finance")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, loadData)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "subscriptions" }, loadData)
          .subscribe();
      }
    } catch (e) {
      console.warn("Finance realtime disabled:", e);
    }

    return () => {
      try { unsubscribe?.(); } catch {}
      try { if (ch2 && supabase) supabase.removeChannel(ch2); } catch {}
    };
  }, [loadData, refreshKey]);

  const pieData = useMemo(
    () => (pieRows || []).map((r) => ({ key: r.discipline, name: r.discipline, value: r.active_members })),
    [pieRows]
  );

  if (loading) return <Loading />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Bienvenue</h1>
          <p className="text-sm text-white/60">Vue d'ensemble</p>
        </div>
        <button
          onClick={() => setOpenCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card variant="glass" className="overflow-hidden relative group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xs text-white/60 font-medium">Actifs</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-1">{stats.activeMembers}</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {stats.memberGrowth >= 0 ? "+" : ""}{stats.memberGrowth}%
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="overflow-hidden relative group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-500/20 rounded-lg">
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xs text-white/60 font-medium">Inactifs</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-1">{stats.inactiveMembers}</p>
            <p className="text-xs text-slate-400">Sans abonnement</p>
          </CardContent>
        </Card>

        <Card variant="glass" className="overflow-hidden relative group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-white/60 font-medium">Check-ins</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-1">{stats.todayCheckins}</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {stats.checkinGrowth >= 0 ? "+" : ""}{stats.checkinGrowth}%
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="overflow-hidden relative group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xs text-white/60 font-medium">Revenus</p>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-white mb-1">
              {new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
                stats.monthlyRevenue || 0
              )}
            </p>
            <p className="text-xs text-amber-400">
              {stats.nbInArrears} en retard
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="glass" className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <span>Check-ins (30j)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={checkins}>
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d1b2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card variant="glass" className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-base">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Par discipline</span>
              </div>
              <span className="text-xs text-white/60 font-normal">
                Total: {pieRows.reduce((sum, r) => sum + r.active_members, 0)} membres
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d1b2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={60}
                  iconType="circle"
                  formatter={(value, entry: any) => (
                    <span style={{ color: "#fff", fontSize: "12px" }}>
                      {value} <span style={{ color: "#94A3B8" }}>({entry.payload.value})</span>
                    </span>
                  )}
                  wrapperStyle={{
                    paddingTop: "10px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <MemberCreateModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          setOpenCreate(false);
          loadData();
        }}
      />
    </div>
  );
}
