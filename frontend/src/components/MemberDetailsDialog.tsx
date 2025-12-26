import { useEffect, useState } from "react";
import { Dialog, DialogBody, DialogFooter } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Input } from "./ui/Input";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/useToast";
import type { MemberSummary, Subscription, Plan } from "../types/member";
import { CreditCard, Calendar, DollarSign } from "lucide-react";

interface MemberDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberSummary | null;
  onDataChanged: () => void;
}

export function MemberDetailsDialog({
  open,
  onOpenChange,
  member,
  onDataChanged,
}: MemberDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showNewSubForm, setShowNewSubForm] = useState(false);
  const [newSubForm, setNewSubForm] = useState({
    plan_id: "",
    start_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (open && member) {
      loadData();
    }
  }, [open, member]);

  async function loadData() {
    if (!member) return;

    try {
      setLoading(true);

      const [subsResult, plansResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("member_id", member.member_id)
          .order("starts_at", { ascending: false }),
        supabase.from("plans").select("*").eq("is_active", true),
      ]);

      if (subsResult.error) throw subsResult.error;
      if (plansResult.error) throw plansResult.error;

      setSubscriptions(subsResult.data || []);
      setPlans(plansResult.data || []);
    } catch (error: any) {
      console.error("Error loading member data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSubscription() {
    if (!member || !newSubForm.plan_id) {
      toast.error("Sélectionnez un plan");
      return;
    }

    const selectedPlan = plans.find((p) => p.id === newSubForm.plan_id);
    if (!selectedPlan) return;

    const startDate = new Date(newSubForm.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

    try {
      setLoading(true);

      const { error } = await supabase.from("subscriptions").insert({
        member_id: member.member_id,
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        starts_at: newSubForm.start_date,
        ends_at: endDate.toISOString().slice(0, 10),
        status: "active",
      });

      if (error) throw error;

      toast.success("Abonnement créé");
      setShowNewSubForm(false);
      setNewSubForm({
        plan_id: "",
        start_date: new Date().toISOString().slice(0, 10),
      });
      onDataChanged();
      await loadData();
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat("fr-BE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  }

  if (!member) return null;

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={`${member.first_name} ${member.last_name}`}
      maxWidth="3xl"
    >
      <DialogBody>
        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Email:</span>
                  <span className="ml-2 text-white">{member.email || "—"}</span>
                </div>
                <div>
                  <span className="text-white/60">Téléphone:</span>
                  <span className="ml-2 text-white">{member.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-white/60">Discipline:</span>
                  <span className="ml-2 text-white">{member.discipline || "—"}</span>
                </div>
                <div>
                  <span className="text-white/60">Statut:</span>
                  <Badge
                    variant={member.is_active ? "success" : "danger"}
                    className="ml-2"
                  >
                    {member.member_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Abonnements
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNewSubForm(!showNewSubForm)}
                  disabled={loading}
                >
                  {showNewSubForm ? "Annuler" : "+ Nouvel abonnement"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewSubForm && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm text-white/80 mb-2">Plan</label>
                    <select
                      className="w-full rounded-xl bg-[#0F2548] text-white px-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={newSubForm.plan_id}
                      onChange={(e) =>
                        setNewSubForm({ ...newSubForm, plan_id: e.target.value })
                      }
                    >
                      <option value="">Sélectionnez un plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - {plan.discipline} ({plan.duration_days} jours) -{" "}
                          {formatCurrency(plan.price * 100)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Date de début"
                    type="date"
                    value={newSubForm.start_date}
                    onChange={(e) =>
                      setNewSubForm({ ...newSubForm, start_date: e.target.value })
                    }
                  />
                  <Button
                    onClick={handleCreateSubscription}
                    loading={loading}
                    className="w-full"
                  >
                    Créer l'abonnement
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {subscriptions.length === 0 ? (
                  <p className="text-white/60 text-sm text-center py-4">
                    Aucun abonnement
                  </p>
                ) : (
                  subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                    >
                      <div>
                        <div className="font-medium text-white">
                          {sub.plan_name || "Plan inconnu"}
                        </div>
                        <div className="text-sm text-white/60">
                          {formatDate(sub.starts_at)} → {formatDate(sub.ends_at)}
                        </div>
                      </div>
                      <Badge variant={sub.status === "active" ? "success" : "neutral"}>
                        {sub.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
