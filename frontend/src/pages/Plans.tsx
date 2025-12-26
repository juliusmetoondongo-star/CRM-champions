import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { BadgeCheck, CalendarClock, CreditCard, ShieldCheck } from "lucide-react";

/* =========================================
   Types
========================================= */
type Audience = "adult" | "ladies" | "kids";

type PriceBlock = {
  monthly?: number;
  quarterly?: number;
  semiannual?: number;
  annual?: number;
  notes?: {
    quarterly?: string;
    semiannual?: string;
    annual?: string;
  };
};

type ScheduleRow = { day: string; time: string; note?: string };

type Course = {
  slug: string;
  title: string;
  audience: Audience;
  color: string;
  fees?: { insurance?: number; card?: number; included?: boolean };
  prices: PriceBlock;
  schedule: ScheduleRow[];
};

/* =========================================
   Fallback (si la vue SQL est absente)
========================================= */
const FALLBACK: Course[] = [
  {
    slug: "boxing",
    title: "Boxe anglaise",
    audience: "adult",
    color: "#3b82f6",
    fees: { insurance: 40, card: 20 },
    prices: {
      monthly: 50,
      quarterly: 140,
      semiannual: 270,
      annual: 500,
      notes: {
        quarterly: "Réduction de 10€",
        semiannual: "Réduction de 30€",
        annual: "Réduction de 50€",
      },
    },
    schedule: [
      { day: "Lundi", time: "18:00 - 19:30" },
      { day: "Mercredi", time: "18:00 - 19:30" },
      { day: "Vendredi", time: "18:00 - 19:30" },
    ],
  },
  {
    slug: "muay_thai",
    title: "Boxe thaïlandaise (Muay Thaï)",
    audience: "adult",
    color: "#a855f7",
    fees: { insurance: 40, card: 20 },
    prices: {
      monthly: 50,
      quarterly: 140,
      semiannual: 270,
      annual: 500,
      notes: {
        quarterly: "Réduction de 10€",
        semiannual: "Réduction de 30€",
        annual: "Réduction de 45€",
      },
    },
    schedule: [
      { day: "Lundi", time: "20:00 - 21:30" },
      { day: "Mercredi", time: "20:00 - 21:30" },
      { day: "Vendredi", time: "20:00 - 21:30" },
    ],
  },
  {
    slug: "mma",
    title: "MMA (Adultes)",
    audience: "adult",
    color: "#ef4444",
    fees: { insurance: 40, card: 20 },
    prices: {
      monthly: 50,
      quarterly: 140,
      semiannual: 270,
      annual: 500,
      notes: {
        quarterly: "Réduction de 10€",
        semiannual: "Réduction de 30€",
        annual: "Réduction de 45€",
      },
    },
    schedule: [
      { day: "Mardi & Jeudi", time: "18:30 - 20:00" },
      { day: "Samedi", time: "12:00 - 13:30" },
    ],
  },
  {
    slug: "muay_thai_ladies",
    title: "Femmes — Muay Thai (Ladies Only)",
    audience: "ladies",
    color: "#f59e0b",
    fees: { insurance: 40, card: 20 },
    prices: {
      monthly: 45,
      quarterly: 125,
      semiannual: 240,
      annual: 450,
      notes: {
        quarterly: "Réduction de 10€",
        semiannual: "Réduction de 30€",
        annual: "Réduction de 45€",
      },
    },
    schedule: [
      { day: "Mardi", time: "17:30 - 19:00" },
      { day: "Samedi", time: "18:00 - 19:30" },
      { day: "Dimanche", time: "11:30 - 13:00" },
    ],
  },
  {
    slug: "bjj_ladies",
    title: "Jiu-Jitsu Brésilien — Ladies Only",
    audience: "ladies",
    color: "#06b6d4",
    fees: { insurance: 40, card: 20 },
    prices: {
      monthly: 40,
      quarterly: 110,
      semiannual: 215,
      annual: 440,
      notes: {
        quarterly: "Réduction de 10€",
        semiannual: "Réduction de 25€",
        annual: "Réduction de 40€",
      },
    },
    schedule: [
      { day: "Lundi", time: "17:30 - 19:00" },
      { day: "Jeudi", time: "17:30 - 19:00" },
    ],
  },
  {
    slug: "kickboxing_kids",
    title: "Kick-Boxing Enfants",
    audience: "kids",
    color: "#84cc16",
    fees: { included: true },
    prices: { annual: 400 },
    schedule: [
      { day: "Mercredi", time: "18:00 - 19:00" },
      { day: "Vendredi", time: "18:00 - 19:00" },
    ],
  },
  {
    slug: "bjj_kids",
    title: "Jiu-Jitsu Brésilien — Enfants",
    audience: "kids",
    color: "#22c55e",
    fees: { included: true },
    prices: { annual: 400 },
    schedule: [
      { day: "Mercredi", time: "15:00 - 16:00" },
      { day: "Samedi", time: "10:00 - 11:00" },
    ],
  },
  {
    slug: "bjj_adult",
    title: "Jiu-Jitsu Brésilien — Adultes",
    audience: "adult",
    color: "#10b981",
    fees: { insurance: 40, card: 20 },
    prices: {
      monthly: 55,
      quarterly: 155,
      semiannual: 300,
      annual: 605,
      notes: {
        quarterly: "Réduction de 10€",
        semiannual: "Réduction de 30€",
        annual: "Réduction de 55€",
      },
    },
    schedule: [
      { day: "Lundi → Vendredi", time: "10:00 - 12:00" },
      { day: "Lundi → Vendredi", time: "18:30 - 20:30" },
      { day: "Samedi", time: "11:00 - 13:00" },
    ],
  },
];

/* =========================================
   Helpers
========================================= */
function formatPrice(n?: number) {
  return typeof n === "number"
    ? new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n)
    : "—";
}

function AudienceBadge({ audience }: { audience: Audience }) {
  const map: Record<Audience, { text: string; cls: string }> = {
    adult: { text: "Adultes", cls: "bg-blue-500/15 text-blue-300 border-blue-400/20" },
    ladies: { text: "Ladies", cls: "bg-pink-500/15 text-pink-300 border-pink-400/20" },
    kids: { text: "Enfants", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" },
  };
  const it = map[audience];
  return <span className={`px-2 py-1 rounded-lg text-xs border ${it.cls}`}>{it.text}</span>;
}

function FeeLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {icon}
      <span>{text}</span>
    </div>
  );
}

/* =========================================
   UI
========================================= */
function PriceTile({ label, value, note }: { label: string; value?: number; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F2548]/40 p-4">
      <div className="text-slate-300 text-sm">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{formatPrice(value)}</div>
      {!!note && <div className="text-xs text-slate-400 mt-1">{note}</div>}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const { title, audience, color, prices, fees, schedule } = course;

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,.35)] p-5 md:p-6"
      style={{ boxShadow: `inset 0 0 0 1px ${color}20, 0 10px 30px -10px ${color}30` }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-semibold text-white">{title}</h2>
        <AudienceBadge audience={audience} />
      </div>

      {/* Tarifs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <PriceTile label="Mensuel" value={prices.monthly} />
        <PriceTile label="Trimestriel" value={prices.quarterly} note={prices.notes?.quarterly} />
        <PriceTile label="Semestriel" value={prices.semiannual} note={prices.notes?.semiannual} />
        <PriceTile label="Annuel" value={prices.annual} note={prices.notes?.annual} />
      </div>

      {/* Horaires */}
      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-white font-medium mb-3">
          <CalendarClock className="w-4 h-4" />
          Horaires de cours
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="text-left p-3">Jour</th>
                <th className="text-left p-3">Horaire</th>
                <th className="text-left p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((r, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="p-3 text-white">{r.day}</td>
                  <td className="p-3 text-white">{r.time}</td>
                  <td className="p-3 text-slate-300">{r.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Frais */}
      <div className="mt-4 rounded-xl border border-white/10 p-3 md:p-4 bg-white/5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          {fees?.included ? (
            <FeeLine icon={<BadgeCheck className="w-4 h-4 text-emerald-400" />} text="Frais d’inscription inclus" />
          ) : (
            <>
              <FeeLine
                icon={<ShieldCheck className="w-4 h-4 text-sky-400" />}
                text={`Assurance annuelle : ${formatPrice(fees?.insurance)} (si applicable)`}
              />
              <FeeLine
                icon={<CreditCard className="w-4 h-4 text-indigo-300" />}
                text={`Carte membre : ${formatPrice(fees?.card)} (si applicable)`}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* =========================================
   Page
========================================= */
export default function Plans() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // Vue attendue côté SQL (OK si vide : fallback)
        const { data, error } = await supabase.from("plans_full_view").select("*");
        if (error || !Array.isArray(data) || data.length === 0) {
          if (!ignore) setCourses(FALLBACK);
          setReady(true);
          return;
        }
        const mapped = mapFromDB(data);
        if (!ignore) setCourses(mapped);
      } catch {
        if (!ignore) setCourses(FALLBACK);
      } finally {
        if (!ignore) setReady(true);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse h-10 w-48 bg-white/10 rounded-lg mb-4" />
        <div className="grid gap-6 md:gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Plans & horaires</h1>
        <p className="text-slate-300">Choisissez la formule qui vous convient et consultez les horaires.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:gap-8">
        {courses.map((c) => (
          <CourseCard key={c.slug} course={c} />
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
        <p className="text-slate-300 text-sm leading-relaxed">
          <strong className="text-white">Remise 2ᵉ abonnement :</strong> si un membre prend un second abonnement, ce
          second plan est automatiquement <b>-50%</b>. Les réductions trimestrielles / semestrielles / annuelles indiquées
          dans les cartes sont déjà incluses.
        </p>
      </div>
    </div>
  );
}

/* =========================================
   Mapper SQL -> Course[]
   (tolérant aux colonnes manquantes)
========================================= */
function mapFromDB(rows: any[]): Course[] {
  const bySlug = new Map<string, Course>();

  for (const r of rows) {
    const slug: string = r.discipline_slug ?? r.slug ?? "unknown";
    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        slug,
        title: r.discipline_name ?? r.name ?? slug,
        audience: (r.audience as Audience) ?? "adult",
        color: r.color ?? "#3b82f6",
        prices: {},
        fees: r.fees_included ? { included: true } : { insurance: r.insurance_fee ?? 40, card: r.card_fee ?? 20 },
        schedule: [],
      });
    }

    const c = bySlug.get(slug)!;

    // Prix
    const duration = String(r.duration ?? r.price_type ?? "").toLowerCase();
    const price = Number(r.price_eur ?? r.price);
    if (!Number.isNaN(price)) {
      if (duration === "monthly" || duration === "mensuel") c.prices.monthly = price;
      if (duration === "quarterly" || duration === "trimestriel") c.prices.quarterly = price;
      if (duration === "semiannual" || duration === "semestriel") c.prices.semiannual = price;
      if (duration === "annual" || duration === "annuel") c.prices.annual = price;
    }

    // Remarques prix si la vue les expose
    if (r.reduction_note && typeof r.reduction_note === "string") {
      c.prices.notes = c.prices.notes ?? {};
      if (duration === "quarterly" || duration === "trimestriel") c.prices.notes.quarterly = r.reduction_note;
      if (duration === "semiannual" || duration === "semestriel") c.prices.notes.semiannual = r.reduction_note;
      if (duration === "annual" || duration === "annuel") c.prices.notes.annual = r.reduction_note;
    }

    // Horaires
    if (r.day_label && r.time_range) {
      c.schedule.push({ day: String(r.day_label), time: String(r.time_range), note: r.lesson_note ?? undefined });
    }
  }

  // Compléter horaires manquants à partir du fallback
  return Array.from(bySlug.values()).map((c) => {
    if (!c.schedule.length) {
      const fb = FALLBACK.find((x) => x.slug === c.slug);
      if (fb) c.schedule = fb.schedule;
    }
    return c;
  });
}