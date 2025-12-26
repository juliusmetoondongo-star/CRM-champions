import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { X, Plus, Loader2 } from "lucide-react";

type Discipline = { id: string; name: string };
type Plan = { id: string; name: string; price_cents: number; discipline_id: string; duration_days?: number | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (memberId: string) => void;
};

export default function NewMemberModal({ open, onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [disciplineId, setDisciplineId] = useState<string>("");
  const [planId, setPlanId] = useState<string>("");
  const [createSub, setCreateSub] = useState(true);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [d, p] = await Promise.all([
        supabase.from("disciplines").select("id,name").order("name",{ascending:true}),
        supabase.from("plans").select("id,name,price_cents,discipline_id,duration_days").order("name",{ascending:true}),
      ]);
      if (!d.error && d.data) setDisciplines(d.data as any);
      if (!p.error && p.data) setPlans(p.data as any);
    })();
  }, [open]);

  const plansFiltered = useMemo(
    () => plans.filter(pl => !disciplineId || pl.discipline_id === disciplineId),
    [plans, disciplineId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // 1) vérif email unique (soft)
      if (email) {
        const { data: exists, error: e1 } = await supabase
          .from("members").select("id").eq("email", email).maybeSingle();
        if (!e1 && exists?.id) {
          setErr("Un membre avec cet e-mail existe déjà.");
          setLoading(false);
          return;
        }
      }

      // 2) create member
      const { data: m, error: e2 } = await supabase
        .from("members")
        .insert({ full_name: fullName, email, phone })
        .select("id")
        .single();

      if (e2) throw e2;
      const memberId = m!.id as string;

      // 3) option: créer abonnement immédiatement
      if (createSub && planId) {
        // récupère plan pour la durée
        const plan = plans.find(p => p.id === planId);
        const starts = new Date(startDate);
        const ends = new Date(starts);
        const addDays = Number(plan?.duration_days ?? 30);
        ends.setDate(ends.getDate() + addDays);

        const { error: e3 } = await supabase.from("subscriptions").insert({
          member_id: memberId,
          plan_id: planId,
          status: "active",
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        });
        if (e3) throw e3;
      }

      onCreated?.(memberId);
      onClose();
      // reset
      setFullName(""); setEmail(""); setPhone("");
      setDisciplineId(""); setPlanId("");
      setCreateSub(true);
      setStartDate(new Date().toISOString().slice(0,10));
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#142D5B] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" /> Nouveau membre
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-white/70">Nom complet</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg bg-[#0F2548] px-3 py-2 text-white border border-white/10"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#0F2548] px-3 py-2 text-white border border-white/10"
              placeholder="ex: john@exemple.com"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#0F2548] px-3 py-2 text-white border border-white/10"
              placeholder="+32 …"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Discipline</label>
            <select
              value={disciplineId}
              onChange={(e) => { setDisciplineId(e.target.value); setPlanId(""); }}
              className="mt-1 w-full rounded-lg bg-[#0F2548] px-3 py-2 text-white border border-white/10"
            >
              <option value="">— Choisir —</option>
              {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/70">Plan (optionnel)</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#0F2548] px-3 py-2 text-white border border-white/10"
              disabled={!disciplineId}
            >
              <option value="">— Aucun —</option>
              {plansFiltered.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {(p.price_cents ?? 0)/100} €
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="createSub"
              type="checkbox"
              checked={createSub}
              onChange={(e)=>setCreateSub(e.target.checked)}
              disabled={!planId}
            />
            <label htmlFor="createSub" className="text-sm text-white/80">
              Créer l’abonnement maintenant
            </label>
          </div>

          <div>
            <label className="text-xs text-white/70">Date de début (abo)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e)=>setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#0F2548] px-3 py-2 text-white border border-white/10"
              disabled={!createSub || !planId}
            />
          </div>

          <div className="md:col-span-2 mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 bg-[#0F2548]/40 text-white hover:bg-[#0F2548]/60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !fullName}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}