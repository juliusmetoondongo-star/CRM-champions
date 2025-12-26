export interface MemberSummary {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  card_uid: string | null;
  discipline: string | null;
  member_status: string;
  is_active: boolean;
  amount_due: number;
  last_scan_at: string | null;
}

export interface Subscription {
  id: string;
  member_id: string;
  plan_id: string | null;
  plan_name: string;
  discipline: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  amount_due: number;
  price: number;
}

export interface Plan {
  id: string;
  name: string;
  discipline: string;
  duration_days: number;
  price: number;
  is_active: boolean;
}
