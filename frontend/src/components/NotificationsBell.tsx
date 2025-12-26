import { useEffect, useMemo, useState } from "react";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  onNewNotification,
  NotificationRow,
} from "../features/notifications/api";

interface NotificationsBellProps {
  onNavigate?: (path: string) => void;
}

export default function NotificationsBell({ onNavigate }: NotificationsBellProps = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchNotifications();
        if (mounted) setItems(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const off = onNewNotification((row) =>
      setItems((prev) => [row, ...prev].slice(0, 15))
    );
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const handleOpen = () => setOpen((v) => !v);

  const handleMarkOne = async (id: string) => {
    await markAsRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-xl bg-[#0F2548] hover:bg-[#132D5A] px-3 py-2 text-white transition"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z" fill="currentColor"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-xs font-semibold">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[380px] max-w-[90vw] rounded-2xl border border-white/10 bg-[#0B1B36] shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-medium text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto py-1">
            {loading ? (
              <p className="px-4 py-6 text-sm text-white/60">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-white/60">Aucune notification</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`grid gap-1 px-4 py-3 transition hover:bg-white/5 ${
                    !n.is_read ? "bg-white/3" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkOne(n.id)}
                        className="text-xs text-blue-300 hover:text-blue-200"
                      >
                        Marquer lu
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-white/70">{n.message}</p>
                  <p className="text-[11px] text-white/50">
                    {new Date(n.created_at).toLocaleString("fr-BE")}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-2 text-right">
            <button
              onClick={() => {
                setOpen(false);
                if (onNavigate) {
                  onNavigate("/notifications");
                } else {
                  window.history.pushState({}, "", "/notifications");
                  window.location.href = "/notifications";
                }
              }}
              className="text-xs text-white/70 hover:text-white"
            >
              Voir toutes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
