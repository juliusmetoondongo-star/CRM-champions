import { supabase } from "../../lib/supabaseClient";

export async function fetchCheckins30Days() {
  const { data, error } = await supabase
    .from("v_chart_checkins_30d")
    .select("*")
    .order("label");

  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    label: d.label,
    value: Number(d.value) || 0,
  }));
}

export async function fetchSubsStatusPie() {
  const { data, error } = await supabase
    .from("v_chart_subscriptions_status")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    name: d.name,
    value: Number(d.value) || 0,
    key: d.key,
  }));
}

export async function fetchRevenue12Months() {
  const { data, error } = await supabase
    .from("v_chart_revenue_12m")
    .select("*")
    .order("month");

  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    month: d.month,
    value: Number(d.value) || 0,
  }));
}

export async function fetchDashboardCounts() {
  const { data, error } = await supabase
    .from("v_dashboard_counts")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return {
    activeMembers: Number(data?.active_members) || 0,
    todayCheckins: Number(data?.checkins_today) || 0,
    monthlyRevenue: Number(data?.revenue_month_eur) || 0,
  };
}
