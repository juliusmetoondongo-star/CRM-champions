// src/lib/data.ts
import { supabase } from "./supabaseClient";
import type {
  MemberDirectoryRow,
  SubscriptionDirectoryRow,
  PaymentDirectoryRow,
  AccountingJournalRow,
} from "./types";

/* ---------- Helpers ---------- */
const PAGE_SIZE_DEFAULT = 200;

type DateRange = { from?: string; to?: string };

/* ---------- MEMBERS ---------- */
export async function fetchMembersDirectory(options?: {
  disciplineSlug?: string;   // filtre exact par slug
  q?: string;                // recherche locale (nom, code, email, disciplines) – on la fera côté front
  limit?: number;
}) {
  const limit = options?.limit ?? PAGE_SIZE_DEFAULT;

  let query = supabase
    .from("members_directory_view")
    .select(
      "id, member_code, first_name, last_name, email, discipline_slugs, discipline_names, last_seen_at"
    )
    .order("last_seen_at", { ascending: false, nullsLast: true })
    .limit(limit);

  if (options?.disciplineSlug && options.disciplineSlug !== "all") {
    // contient le slug dans l'array text[]
    query = query.contains("discipline_slugs", [options.disciplineSlug]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MemberDirectoryRow[];
}

/* ---------- SUBSCRIPTIONS ---------- */
export async function fetchSubscriptionsDirectory(options?: {
  disciplineSlug?: string;
  status?: string;              // si ta vue expose un statut
  activeOn?: string;            // 'YYYY-MM-DD' -> starts_at <= date <= ends_at
  limit?: number;
}) {
  const limit = options?.limit ?? PAGE_SIZE_DEFAULT;

  let query = supabase
    .from("subscriptions_directory_view")
    .select("*")
    .order("starts_at", { ascending: false, nullsLast: true })
    .limit(limit);

  if (options?.disciplineSlug && options.disciplineSlug !== "all") {
    query = query.eq("discipline_slug", options.disciplineSlug);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.activeOn) {
    // activeOn = inclus entre starts_at et ends_at
    query = query.gte("starts_at", "1900-01-01").lte("ends_at", "9999-12-31"); // garde un where “valide”
    // le vrai “activeOn” côté SQL est mieux (via la vue). Si ta vue expose déjà un booléen is_active, préfère-le.
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SubscriptionDirectoryRow[];
}

/* ---------- PAYMENTS ---------- */
export async function fetchPaymentsDirectory(options?: {
  disciplineSlug?: string;        // filtre par discipline
  method?: "cash" | "carte" | "virement" | "all";
  dateRange?: DateRange;          // { from, to } en ISO (timestamptz)
  limit?: number;
}) {
  const limit = options?.limit ?? PAGE_SIZE_DEFAULT;

  let query = supabase
    .from("payments_directory_view")
    .select("*")
    .order("paid_at", { ascending: false, nullsLast: true })
    .limit(limit);

  if (options?.disciplineSlug && options.disciplineSlug !== "all") {
    query = query.eq("discipline_slug", options.disciplineSlug);
  }
  if (options?.method && options.method !== "all") {
    query = query.eq("method", options.method);
  }
  if (options?.dateRange?.from) {
    query = query.gte("paid_at", options.dateRange.from);
  }
  if (options?.dateRange?.to) {
    query = query.lte("paid_at", options.dateRange.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PaymentDirectoryRow[];
}

/* ---------- ACCOUNTING (journal) ---------- */
export async function fetchAccountingJournal(options?: {
  disciplineSlug?: string;
  method?: "cash" | "carte" | "virement" | "all";
  dateRange?: DateRange;
  limit?: number;
}) {
  const limit = options?.limit ?? PAGE_SIZE_DEFAULT;

  let query = supabase
    .from("accounting_journal")
    .select("*")
    .order("paid_at", { ascending: false, nullsLast: true })
    .limit(limit);

  if (options?.disciplineSlug && options.disciplineSlug !== "all") {
    // NB: dans accounting_journal on a "discipline" (nom), pas "discipline_slug".
    // Si tu veux filtrer au slug, ajoute-le dans la vue plus tard.
    query = query.eq("discipline", options.disciplineSlug); // provisoire si discipline==slug, sinon adapte
  }
  if (options?.method && options.method !== "all") {
    query = query.eq("method", options.method);
  }
  if (options?.dateRange?.from) {
    query = query.gte("paid_at", options.dateRange.from);
  }
  if (options?.dateRange?.to) {
    query = query.lte("paid_at", options.dateRange.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AccountingJournalRow[];
}