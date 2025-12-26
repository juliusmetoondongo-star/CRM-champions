// src/lib/types.ts

/** Vue: members_directory_view */
export type MemberDirectoryRow = {
  id: string;
  member_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  discipline_slugs: string[] | null;
  discipline_names: string[] | null;
  last_seen_at: string | null; // timestamptz
};

/** Vue: subscriptions_directory_view */
export type SubscriptionDirectoryRow = {
  subscription_id: string;
  member_id: string;
  member_code: string | null;
  member_name: string | null;
  member_email: string | null;
  plan_id: string | null;
  plan_name: string | null;
  discipline_slug: string | null;
  discipline_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
  price_eur: number | null;
  total_eur: number | null;
  currency: string | null;
};

/** Vue: payments_directory_view */
export type PaymentDirectoryRow = {
  payment_id: string;
  paid_at: string | null;
  amount_eur: number | null;
  currency: string | null;
  method: "cash" | "carte" | "virement" | string | null;
  status: string | null;
  memo: string | null;

  member_id: string | null;
  member_name: string | null;
  member_email: string | null;
  member_code: string | null;

  subscription_id: string | null;
  plan_name: string | null;
  discipline_slug: string | null;
  discipline_name: string | null;
  product_code: string | null;
};

/** Vue: accounting_journal */
export type AccountingJournalRow = {
  payment_id: string;
  paid_at: string | null;
  amount_eur: number | null;
  currency: string | null;
  method: "cash" | "carte" | "virement" | string | null;
  status: string | null;
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