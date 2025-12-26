// src/types/models.ts

/** ======================
 *  MEMBRES (lecture seule)
 *  ====================== */
export type MemberRow = {
  id: string
  member_code: string | null
  card_uid: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  /** Disciplines issues des abonnements ACTIFS du membre */
  discipline_slugs: string[] | null
  discipline_names: string[] | null
  /** Dernier scan (si dispo) */
  last_seen_at: string | null
};

/** ==================================
 *  ABONNEMENTS (lecture seule, normalisés)
 *  ================================== */
export type SubscriptionStatus = 'active' | 'paused' | 'canceled' | 'expired';

export type SubscriptionRow = {
  subscription_id: string
  member_id: string
  member_code: string | null
  member_name: string | null
  member_email: string | null

  plan_id: string
  plan_name: string | null
  discipline_slug: string | null
  discipline_name: string | null

  starts_at: string | null
  ends_at: string | null
  status: SubscriptionStatus
};

/** ======================
 *  PAIEMENTS (lecture seule)
 *  ====================== */
export type PaymentRow = {
  payment_id: string
  paid_at: string  // ISO

  member_id: string
  member_code: string | null
  member_name: string | null
  member_email: string | null

  plan_id?: string | null
  plan_name?: string | null
  discipline_slug?: string | null
  discipline_name?: string | null

  /** Montant en euros (décimal, pas en cents) */
  amount_eur: number
  currency: string          // 'EUR'
  method: string | null     // 'cash' | 'carte' | 'virement' | ...
  note: string | null
};

/** =================================
 *  COMPTA (journal) = mêmes colonnes
 *  ================================= */
export type AccountingRow = PaymentRow;

/** ======================
 *  HELPERS côté UI (facultatifs)
 *  ====================== */
export const isActive = (s: SubscriptionRow) => s.status === 'active';
export const isPaused = (s: SubscriptionRow) => s.status === 'paused';
export const isCanceled = (s: SubscriptionRow) => s.status === 'canceled';
export const isExpired = (s: SubscriptionRow) => s.status === 'expired';