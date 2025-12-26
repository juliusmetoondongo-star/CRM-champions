import { supabase } from "../../lib/supabaseClient";

export interface MemberPayment {
  id: string;
  member_id: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  method: string | null;
  status: string;
  meta: Record<string, any>;
}

export async function payAnnualInsurance(
  memberId: string,
  year: number = new Date().getFullYear(),
  method: string = "cash"
): Promise<string | null> {
  const { data, error } = await supabase.rpc("pay_annual_insurance", {
    p_member_id: memberId,
    p_year: year,
    p_method: method,
    p_status: "paid",
  });

  if (error) throw error;
  return data as string | null;
}

export async function issueFirstCard(
  memberId: string,
  cardUid: string,
  method: string = "cash"
): Promise<string | null> {
  const { data, error } = await supabase.rpc("issue_first_card", {
    p_member_id: memberId,
    p_card_uid: cardUid,
    p_method: method,
    p_status: "paid",
  });

  if (error) throw error;
  return data as string | null;
}

export async function replaceCard(
  memberId: string,
  newCardUid: string,
  method: string = "cash"
): Promise<string> {
  const { data, error } = await supabase.rpc("replace_card", {
    p_member_id: memberId,
    p_new_card_uid: newCardUid,
    p_method: method,
    p_status: "paid",
  });

  if (error) throw error;
  return data as string;
}

export async function fetchMemberPayments(
  memberId: string
): Promise<MemberPayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("member_id", memberId)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return data as MemberPayment[];
}

export async function hasInsuranceThisYear(
  memberId: string
): Promise<boolean> {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from("v_insurance_paid_this_year")
    .select("member_id")
    .eq("member_id", memberId)
    .eq("insurance_year", year)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function hasFirstCardPaid(memberId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("v_first_card_already_paid")
    .select("member_id")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
