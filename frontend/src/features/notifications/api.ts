import { supabase } from "../../lib/supabaseClient";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  member_id: string | null;
  payload: any;
  is_read: boolean;
  created_at: string;
};

export async function fetchNotifications(limit = 15) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as NotificationRow[];
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllAsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  if (error) throw error;
}

export function onNewNotification(cb: (row: NotificationRow) => void) {
  const channel = supabase
    .channel("notif-inserts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      (payload) => cb(payload.new as NotificationRow)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
