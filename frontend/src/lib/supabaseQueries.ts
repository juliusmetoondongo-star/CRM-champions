import { supabase } from "./supabaseClient";

/**
 * Centralized Supabase queries for Champion's Academy CRM
 * All functions are safe: try/catch + fallback returns
 */

// ==================== DASHBOARD ====================

export async function getDashboardCounts(): Promise<{
  active_members: number;
  revenue_mtd: number;
  remaining_due: number;
  nb_in_arrears: number;
  today_checkins?: number;
}> {
  try {
    const { data, error } = await supabase
      .rpc("get_dashboard_counts")
      .maybeSingle();

    if (error) throw error;

    return {
      active_members: Number(data?.active_members) || 0,
      revenue_mtd: Number(data?.revenue_mtd) || 0,
      remaining_due: Number(data?.remaining_due) || 0,
      nb_in_arrears: Number(data?.nb_in_arrears) || 0,
      today_checkins: Number(data?.today_checkins) || 0,
    };
  } catch (error) {
    console.error("Error fetching dashboard counts:", error);
    return {
      active_members: 0,
      revenue_mtd: 0,
      remaining_due: 0,
      nb_in_arrears: 0,
      today_checkins: 0,
    };
  }
}

export async function getCheckinsChart30Days(): Promise<
  Array<{ label: string; value: number }>
> {
  try {
    const { data, error } = await supabase
      .rpc("get_checkins_chart_30days");

    if (error) throw error;

    return (data || []).map((item: any) => ({
      label: item.label,
      value: Number(item.value) || 0,
    }));
  } catch (error) {
    console.error("Error fetching check-ins chart:", error);
    return [];
  }
}

export async function getActiveMembersByDiscipline(): Promise<
  Array<{ discipline: string; active_members: number }>
> {
  try {
    const { data, error } = await supabase
      .rpc("get_active_members_by_discipline");

    if (error) throw error;

    return (data || []).map((item: any) => ({
      discipline: item.discipline || "Non définie",
      active_members: Number(item.active_members) || 0,
    }));
  } catch (error) {
    console.error("Error fetching active members by discipline:", error);
    return [];
  }
}

export async function getRevenueChart12Months(): Promise<
  Array<{ month: string; value: number }>
> {
  try {
    const { data, error } = await supabase
      .rpc("get_revenue_chart_12months");

    if (error) throw error;

    return (data || []).map((item: any) => ({
      month: item.month,
      value: Number(item.value) || 0,
    }));
  } catch (error) {
    console.error("Error fetching revenue chart:", error);
    return [];
  }
}

// ==================== DISCIPLINES & PLANS ====================

export async function getDisciplines(): Promise<
  Array<{ id: string; slug: string; name: string }>
> {
  try {
    const { data, error } = await supabase
      .from("disciplines")
      .select("id, slug, name")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching disciplines:", error);
    return [];
  }
}

export async function getActivePlans(): Promise<
  Array<{
    id: string;
    name: string;
    discipline_name: string | null;
    category: "adults" | "ladies" | "kids";
    billing_period: "monthly" | "quarterly" | "semiannual" | "annual";
    price_cents: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    return (
      data?.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        discipline_name: plan.discipline_name || null,
        category: plan.category || "adults",
        billing_period: plan.billing_period || "monthly",
        price_cents: Number(plan.price_cents) || 0,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching active plans:", error);
    return [];
  }
}

// ==================== MEMBERS ====================

// Mapping des slugs vers les noms de disciplines normalisés
const disciplineSlugToName: Record<string, string> = {
  'boxe-anglaise': 'Boxe Anglaise',
  'boxe-thai': 'Boxe Thaï',
  'muay_thai_ladies': 'Femmes – Muay Thai (Ladies Only)',
  'bjj_adult': 'Jiu-Jitsu Brésilien – Adultes',
  'bjj_ladies': 'Jiu-Jitsu Brésilien – Ladies Only',
  'bjj_kids': 'Jiu-Jitsu Brésilien Enfants',
  'kick-boxing': 'Kick Boxing',
  'kickboxing_kids': 'Kickboxing Enfants',
  'mma': 'MMA',
};

export async function getMembersDirectory(args: {
  discipline?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const requestedLimit = args.limit ?? 10000;
    const offset = args.offset ?? 0;

    // Supabase a une limite de 1000 résultats par requête
    // On va faire plusieurs requêtes si nécessaire
    const BATCH_SIZE = 1000;
    const allMembers: any[] = [];
    let currentOffset = offset;
    let hasMore = true;

    while (hasMore && allMembers.length < requestedLimit) {
      const remainingLimit = requestedLimit - allMembers.length;
      const currentBatchSize = Math.min(BATCH_SIZE, remainingLimit);

      let q = supabase
        .from("v_member_directory")
        .select("*", { count: "exact" })
        .order("member_code", { ascending: true });

      if (args.discipline && args.discipline !== "all") {
        // Mapper le slug vers le nom de discipline
        const disciplineName = disciplineSlugToName[args.discipline] || args.discipline;
        q = q.eq("discipline", disciplineName);
      }

      if (args.search?.trim()) {
        const s = args.search.trim();
        q = q.or(
          [
            `full_name.ilike.%${s}%`,
            `member_code.ilike.%${s}%`,
          ].join(",")
        );
      }

      q = q.range(currentOffset, currentOffset + currentBatchSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;

      if (data && data.length > 0) {
        allMembers.push(...data);
        currentOffset += data.length;

        // Si on a reçu moins que demandé, c'est qu'il n'y en a plus
        hasMore = data.length === currentBatchSize;
      } else {
        hasMore = false;
      }

      // Log pour debug (seulement sur la dernière itération)
      if (!hasMore) {
        console.log(`getMembersDirectory: Loaded ${allMembers.length} members in total (count: ${count || "unknown"})`);
      }
    }

    return allMembers.map((m: any) => {
      return {
        id: m.id,
        member_code: m.member_code ?? null,
        first_name: m.first_name ?? '',
        last_name: m.last_name ?? '',
        email: m.email ?? null,
        phone: m.phone ?? null,
        status: m.member_status ?? m.status ?? "unknown",
        discipline_slugs: [m.discipline?.toLowerCase().replace(/\s+/g, '-') || ''],
        discipline_names: [m.discipline || ''],
        last_seen_at: m.last_scan_at ?? null,
        created_at: m.created_at ?? null,
        updated_at: m.updated_at ?? null,
      };
    });
  } catch (error) {
    console.error("Error fetching members directory:", error);
    return [];
  }
}

export async function getMemberById(id: string): Promise<{
  id: string;
  member_code: string | null;
  card_uid: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  address: string | null;
  status: "active" | "inactive" | "suspended" | null;
  is_competitor: boolean;
  notes: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      member_code: data.member_code || null,
      card_uid: data.card_uid || data.rfid_uid || null,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      email: data.email || null,
      phone: data.phone || null,
      birthdate: data.birthdate || null,
      address: data.address || null,
      status: data.status || null,
      is_competitor: Boolean(data.is_competitor),
      notes: data.notes || null,
    };
  } catch (error) {
    console.error("Error fetching member by id:", error);
    return null;
  }
}

export async function getMemberStatus(
  id: string
): Promise<{ computed_status: string } | null> {
  try {
    const { data, error } = await supabase
      .from("v_member_status")
      .select("*")
      .eq("member_id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      computed_status: data.computed_status || data.status || "unknown",
    };
  } catch (error) {
    console.error("Error fetching member status:", error);
    return null;
  }
}

export async function getMemberDisciplines(
  id: string
): Promise<Array<{ id: string; discipline_id?: string }>> {
  try {
    const { data, error } = await supabase
      .from("member_disciplines")
      .select("*")
      .eq("member_id", id);

    if (error) throw error;

    return (
      data?.map((md: any) => ({
        id: md.id,
        discipline_id: md.discipline_id,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching member disciplines:", error);
    return [];
  }
}

export async function addMemberDiscipline(
  memberId: string,
  disciplineId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("member_disciplines")
      .insert({ member_id: memberId, discipline_id: disciplineId });

    if (error) throw error;
  } catch (error) {
    console.error("Error adding member discipline:", error);
    throw error;
  }
}

export async function removeMemberDiscipline(
  memberId: string,
  disciplineId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("member_disciplines")
      .delete()
      .eq("member_id", memberId)
      .eq("discipline_id", disciplineId);

    if (error) throw error;
  } catch (error) {
    console.error("Error removing member discipline:", error);
    throw error;
  }
}

export async function updateMember(patch: {
  id: string;
  member_code: string | null;
  card_uid: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  address: string | null;
  status: "active" | "inactive" | "suspended";
  is_competitor: boolean;
  notes: string | null;
}): Promise<void> {
  try {
    const { id, ...updates } = patch;

    const { error } = await supabase
      .from("members")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating member:", error);
    throw error;
  }
}

// ==================== SUBSCRIPTIONS ====================

export async function getMemberSubscriptions(
  memberId: string
): Promise<
  Array<{
    id: string;
    member_id: string;
    plan_name: string | null;
    price_cents: number | null;
    starts_at: string;
    ends_at: string;
    status: "active" | "expired" | "upcoming" | string;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (
      data?.map((sub: any) => ({
        id: sub.id,
        member_id: sub.member_id,
        plan_name: sub.plan_name || null,
        price_cents: sub.price_cents || null,
        starts_at: sub.starts_at || sub.start_date,
        ends_at: sub.ends_at || sub.end_date,
        status: sub.status || "unknown",
      })) || []
    );
  } catch (error) {
    console.error("Error fetching member subscriptions:", error);
    return [];
  }
}

export async function createSubscription(payload: {
  member_id: string;
  plan_name: string;
  price_cents: number;
  starts_at: string;
  ends_at: string;
  status: "active" | "upcoming" | "expired";
}): Promise<void> {
  try {
    const { error } = await supabase.from("subscriptions").insert({
      member_id: payload.member_id,
      plan_name: payload.plan_name,
      price_cents: payload.price_cents,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      status: payload.status,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

// ==================== PAYMENTS ====================

export async function getPaymentsDirectory(args: {
  memberId?: string;
}): Promise<
  Array<{
    id: string;
    member_id: string;
    amount_cents: number;
    currency: string | null;
    method: string | null;
    category: string | null;
    paid_at: string | null;
    receipt_url: string | null;
    status: "paid" | "due";
    note: string | null;
    subscription_id?: string | null;
  }>
> {
  try {
    let query = supabase.from("payments").select("*");

    if (args.memberId) {
      query = query.eq("member_id", args.memberId);
    }

    query = query.order("paid_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (
      data?.map((p: any) => ({
        id: p.id,
        member_id: p.member_id,
        amount_cents: Number(p.amount_cents) || 0,
        currency: p.currency || "EUR",
        method: p.method || null,
        category: p.category || null,
        paid_at: p.paid_at || null,
        receipt_url: p.receipt_url || null,
        status: p.status === "completed" || p.status === "paid" ? "paid" : "due",
        note: p.memo || p.note || null,
        subscription_id: p.subscription_id || null,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching payments directory:", error);
    return [];
  }
}

export async function createPayment(payload: {
  member_id: string;
  amount_cents: number;
  currency: string;
  method: string | null;
  category: string | null;
  status: "paid" | "due";
  note: string | null;
  paid_at: string | null;
  subscription_id?: string | null;
}): Promise<void> {
  try {
    const { error } = await supabase.from("payments").insert({
      member_id: payload.member_id,
      amount_cents: payload.amount_cents,
      currency: payload.currency,
      method: payload.method,
      category: payload.category,
      status: payload.status === "paid" ? "completed" : "pending",
      memo: payload.note,
      paid_at: payload.paid_at || new Date().toISOString(),
      subscription_id: payload.subscription_id,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  patch: { status: "paid" | "due"; paid_at: string | null; method?: string | null }
): Promise<void> {
  try {
    const updates: any = {
      status: patch.status === "paid" ? "completed" : "pending",
      paid_at: patch.paid_at,
    };

    if (patch.method) {
      updates.method = patch.method;
    }

    const { error } = await supabase
      .from("payments")
      .update(updates)
      .eq("id", paymentId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
}

// ==================== CHECKINS ====================

export async function getMemberCheckins(
  memberId: string
): Promise<
  Array<{
    id: string;
    scanned_at: string;
    location: string | null;
    source: string | null;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .eq("member_id", memberId)
      .order("scanned_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return (
      data?.map((c: any) => ({
        id: c.id,
        scanned_at: c.scanned_at || c.created_at,
        location: c.location || null,
        source: c.source || null,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching member check-ins:", error);
    return [];
  }
}

// ==================== REALTIME ====================

export function subscribeToCheckins(onInsert: () => void): () => void {
  try {
    const channel = supabase
      .channel("checkins-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "checkins" },
        () => {
          onInsert();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error("Error subscribing to check-ins:", error);
    return () => {};
  }
}

export function subscribeToFinance(onChange: () => void): () => void {
  try {
    const paymentsChannel = supabase
      .channel("payments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          onChange();
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel("subscriptions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  } catch (error) {
    console.error("Error subscribing to finance:", error);
    return () => {};
  }
}
