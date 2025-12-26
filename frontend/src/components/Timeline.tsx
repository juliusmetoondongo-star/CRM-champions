import { Clock, CreditCard, Ticket, MapPin } from "lucide-react";

type TimelineEvent =
  | { kind: "checkin"; ts: string; data: { location?: string; source?: string } }
  | { kind: "payment"; ts: string; data: { amount_cents: number; currency?: string; method?: string; category?: string; discipline?: string } }
  | { kind: "subscription"; ts: string; data: { plan_name?: string; discipline?: string; ends_at?: string; status?: string } };

export function Timeline({ items }: { items: TimelineEvent[] }) {
  if (!items?.length) {
    return <div className="text-sm text-neutral-400">Aucun événement pour le moment.</div>;
  }

  const iconFor = (k: TimelineEvent["kind"]) => {
    if (k === "checkin") return <MapPin className="w-4 h-4" />;
    if (k === "payment") return <CreditCard className="w-4 h-4" />;
    return <Ticket className="w-4 h-4" />; // subscription
  };

  const colorFor =
    (k: TimelineEvent["kind"]) =>
      k === "payment" ? "bg-emerald-500" : k === "subscription" ? "bg-sky-500" : "bg-indigo-500";

  return (
    <ol className="relative ml-3">
      {items.map((ev, i) => {
        const date = new Date(ev.ts);
        const when = date.toLocaleString("fr-FR", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
        });

        return (
          <li key={i} className="pl-6 pb-5 border-l border-white/10 relative">
            <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ${colorFor(ev.kind)}`} />
            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
              {iconFor(ev.kind)}
              <span className="uppercase tracking-wide">
                {ev.kind === "checkin" ? "Check-in" : ev.kind === "payment" ? "Paiement" : "Abonnement"}
              </span>
              <span className="text-neutral-500">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {when}
              </span>
            </div>

            {ev.kind === "checkin" && (
              <div className="text-sm text-white">
                Passage {ev.data.source ? `(${ev.data.source}) ` : ""}— {ev.data.location ?? "Lieu inconnu"}
              </div>
            )}

            {ev.kind === "payment" && (
              <div className="text-sm text-white">
                {(ev.data.amount_cents / 100).toFixed(2)} {ev.data.currency ?? "EUR"}
                {ev.data.method ? ` • ${ev.data.method}` : ""}
                {ev.data.category ? ` • ${ev.data.category}` : ""}
                {ev.data.discipline ? ` • ${ev.data.discipline}` : ""}
              </div>
            )}

            {ev.kind === "subscription" && (
              <div className="text-sm text-white">
                {ev.data.plan_name ?? "Abonnement"}{ev.data.discipline ? ` • ${ev.data.discipline}` : ""}
                {ev.data.status ? ` • ${ev.data.status}` : ""}
                {ev.data.ends_at ? ` • fin: ${new Date(ev.data.ends_at).toLocaleDateString("fr-FR")}` : ""}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}