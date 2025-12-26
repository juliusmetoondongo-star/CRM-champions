import { useEffect, useState } from "react";
import { fetchNotifications, markAsRead, NotificationRow } from "../features/notifications/api";
import { Card } from "../components/ui/Card";
import { Loading } from "../components/ui/Loading";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchNotifications(100);
        setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mark = async (id: string) => {
    await markAsRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
        <p className="text-muted">Toutes vos notifications</p>
      </div>

      <Card variant="glass">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/70">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between px-6 py-4 transition hover:bg-white/5 ${
                  !n.is_read ? "bg-white/3" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold">{n.title}</span>
                    {!n.is_read && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                  </div>
                  <p className="text-sm text-white/70 mb-2">{n.message}</p>
                  <p className="text-xs text-white/50">
                    {new Date(n.created_at).toLocaleString("fr-BE")}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => mark(n.id)}
                    className="ml-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 transition"
                  >
                    Marquer lu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
