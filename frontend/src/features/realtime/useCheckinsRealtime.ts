import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

interface CheckinInsert {
  id: string;
  member_id: string;
  scanned_at: string;
  source: string;
  location: string;
  created_at: string;
}

export function useCheckinsRealtime(onNewCheckin: (checkin: CheckinInsert) => void) {
  useEffect(() => {
    const channel = supabase
      .channel("checkins-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "checkins",
        },
        (payload) => {
          onNewCheckin(payload.new as CheckinInsert);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewCheckin]);
}
