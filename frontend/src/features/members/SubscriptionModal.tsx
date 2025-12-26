import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Dialog, DialogBody, DialogFooter } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../hooks/useToast";
import { DISCIPLINES } from "../plans/catalog";

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  memberId: string;
}

export function SubscriptionModal({
  open,
  onClose,
  onSuccess,
  memberId,
}: SubscriptionModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [memberDiscipline, setMemberDiscipline] = useState<string>("boxe");
  const [form, setForm] = useState({
    plan_name: "",
    price_cents: 5000,
    starts_at: new Date().toISOString().slice(0, 10),
    ends_at: "",
    status: "active" as "active" | "inactive" | "expired",
  });

  useEffect(() => {
    if (open) {
      loadMemberDiscipline();
    }
  }, [open, memberId]);

  async function loadMemberDiscipline() {
    try {
      // Charger la discipline depuis member_disciplines
      const { data: memberDisc, error: discError } = await supabase
        .from("member_disciplines")
        .select("disciplines(slug)")
        .eq("member_id", memberId)
        .maybeSingle();

      if (!discError && memberDisc?.disciplines) {
        const slug = (memberDisc.disciplines as any).slug;
        setMemberDiscipline(slug);

        // Initialiser avec le premier plan de cette discipline
        const discipline = DISCIPLINES.find((d) => d.slug === slug);
        if (discipline && discipline.plans.length > 0) {
          const firstPlan = discipline.plans[0];
          setForm({
            plan_name: firstPlan.title,
            price_cents: firstPlan.price * 100,
            starts_at: new Date().toISOString().slice(0, 10),
            ends_at: "",
            status: "active",
          });
        }
      } else {
        // Par défaut : Boxe Anglaise
        setMemberDiscipline("boxe");
        const firstPlan = DISCIPLINES[0].plans[0];
        setForm({
          plan_name: firstPlan.title,
          price_cents: firstPlan.price * 100,
          starts_at: new Date().toISOString().slice(0, 10),
          ends_at: "",
          status: "active",
        });
      }
    } catch (error) {
      console.error("Error loading member discipline:", error);
    }
  }

  const update = (k: keyof typeof form, v: any) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const availablePlans = DISCIPLINES.find((d) => d.slug === memberDiscipline)?.plans || [];

  // Mettre à jour le prix quand le plan change
  const handlePlanChange = (planTitle: string) => {
    const selectedPlan = availablePlans.find((p) => p.title === planTitle);
    if (selectedPlan) {
      update("plan_name", planTitle);
      update("price_cents", selectedPlan.price * 100);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.plan_name) {
      toast.error("Veuillez sélectionner un plan");
      return;
    }

    if (!form.starts_at || !form.ends_at) {
      toast.error("Dates de début et fin requises");
      return;
    }

    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("subscriptions").insert({
        member_id: memberId,
        plan_name: form.plan_name,
        price_cents: form.price_cents,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        status: form.status,
      });

      if (error) throw error;

      toast.success("Abonnement créé");
      onSuccess();
      onClose();
      setForm({
        plan_name: "",
        price_cents: 5000,
        starts_at: new Date().toISOString().slice(0, 10),
        ends_at: "",
        status: "active",
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      toast.error(error?.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => {
    setForm({
      plan_name: "",
      price_cents: 5000,
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: "",
      status: "active",
    });
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={handleClose} title="Nouvel abonnement">
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Plan d'abonnement
                <span className="ml-2 text-xs text-white/60">
                  ({DISCIPLINES.find((d) => d.slug === memberDiscipline)?.title || "Boxe"})
                </span>
              </label>
              <select
                className="w-full rounded-xl bg-[#0F2548] text-white px-4 py-2.5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.plan_name}
                onChange={(e) => handlePlanChange(e.target.value)}
                required
              >
                {availablePlans.map((plan) => (
                  <option key={plan.title} value={plan.title}>
                    {plan.title} → {plan.price}€
                  </option>
                ))}
              </select>
              {form.plan_name && (
                <p className="mt-2 text-sm text-emerald-400">
                  Prix : {(form.price_cents / 100).toFixed(2)}€
                </p>
              )}
            </div>

            <Input
              label="Date de début"
              type="date"
              value={form.starts_at}
              onChange={(e) => update("starts_at", e.target.value)}
              required
            />

            <Input
              label="Date de fin"
              type="date"
              value={form.ends_at}
              onChange={(e) => update("ends_at", e.target.value)}
              required
            />

            <div>
              <label className="block text-sm text-white/80 mb-2">Statut</label>
              <select
                className="w-full rounded-xl bg-[#0F2548] text-white px-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="expired">Expiré</option>
              </select>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Créer l'abonnement
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
