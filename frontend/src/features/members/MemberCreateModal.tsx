import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useKeyboardBuffer } from "../../utils/useKeyboardBuffer";
import { Dialog, DialogBody, DialogFooter } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../hooks/useToast";
import { CreditCard, AlertCircle } from "lucide-react";
import { DISCIPLINES } from "../plans/catalog";

interface MemberCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

function normalizeUID(s: string) {
  return s.replace(/[^0-9a-z]/gi, "").toUpperCase();
}

export function MemberCreateModal({ open, onClose, onCreated, onSuccess }: MemberCreateModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birthdate: "",
    address: "",
    status: "active" as "active" | "inactive" | "suspended",
    is_competitor: false,
    card_uid: "",
    member_code: "",
    discipline: "boxe-anglaise",
  });
  const [createFirstMonth, setCreateFirstMonth] = useState(true);
  const [selectedPlanTitle, setSelectedPlanTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [scanHint, setScanHint] = useState("En attente de scan...");

  const onScan = useCallback((raw: string) => {
    const uid = normalizeUID(raw);
    if (!uid) return;
    setForm(f => ({ ...f, card_uid: uid }));
    setScanHint(`✓ Carte scannée`);
    toast.success(`Carte RFID scannée`);
  }, [toast]);

  useKeyboardBuffer(onScan);

  const update = (k: keyof typeof form, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  // Obtenir les plans disponibles pour la discipline sélectionnée depuis le catalogue
  const availablePlans = useMemo(() => {
    const discipline = DISCIPLINES.find((d) => d.slug === form.discipline);
    return discipline?.plans || [];
  }, [form.discipline]);

  // Initialiser le plan sélectionné quand la discipline change
  useEffect(() => {
    if (availablePlans.length > 0 && !selectedPlanTitle) {
      setSelectedPlanTitle(availablePlans[0].title);
    } else if (availablePlans.length === 0) {
      setSelectedPlanTitle("");
    }
  }, [availablePlans, selectedPlanTitle]);

  const selectedPlan = useMemo(
    () => availablePlans.find(p => p.title === selectedPlanTitle),
    [availablePlans, selectedPlanTitle]
  );

  const resetForm = () => {
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      birthdate: "",
      address: "",
      status: "active",
      is_competitor: false,
      card_uid: "",
      member_code: "",
      discipline: "boxe-anglaise",
    });
    setScanHint("En attente de scan...");
    setSelectedPlanTitle("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Prénom et nom requis");
      return;
    }

    const uid = normalizeUID(form.card_uid || "");
    if (!uid) {
      toast.error("Scannez une carte RFID");
      return;
    }

    setLoading(true);
    try {
      const { data: existing, error: exErr } = await supabase
        .from("members")
        .select("id")
        .eq("card_uid", uid)
        .maybeSingle();

      if (exErr) throw exErr;
      if (existing) {
        toast.error("Cette carte est déjà associée à un membre");
        setLoading(false);
        return;
      }

      const generateMemberCode = () => {
        const timestamp = Date.now().toString().slice(-6);
        return `M${timestamp}`;
      };

      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birthdate: form.birthdate || null,
        address: form.address.trim() || null,
        status: form.status,
        is_competitor: form.is_competitor,
        card_uid: uid,
        member_code: form.member_code.trim() || generateMemberCode(),
      };

      const { data: inserted, error: insErr } = await supabase
        .from("members")
        .insert(payload)
        .select("id, first_name, last_name, member_code")
        .single();

      if (insErr) throw insErr;

      // Associer la discipline sélectionnée
      if (inserted && form.discipline) {
        const { data: disciplineData } = await supabase
          .from("disciplines")
          .select("id")
          .eq("slug", form.discipline)
          .maybeSingle();

        if (disciplineData) {
          await supabase.from("member_disciplines").insert({
            member_id: inserted.id,
            discipline_id: disciplineData.id,
          });
        }
      }

      // Créer l'abonnement si demandé et plan sélectionné
      if (createFirstMonth && selectedPlanTitle && inserted) {
        const plan = availablePlans.find(p => p.title === selectedPlanTitle);
        if (plan) {
          const starts = new Date();
          const ends = new Date();

          // Calculer la durée en jours selon l'unité
          let durationDays = 30;
          if (plan.unit === "/3 mois") durationDays = 90;
          else if (plan.unit === "/6 mois") durationDays = 180;
          else if (plan.unit === "/An") durationDays = 365;

          ends.setDate(starts.getDate() + durationDays);

          const { error: subErr } = await supabase.from("subscriptions").insert({
            member_id: inserted.id,
            plan_name: plan.title,
            discipline: form.discipline,
            price_cents: plan.price * 100,
            starts_at: starts.toISOString().slice(0, 10),
            ends_at: ends.toISOString().slice(0, 10),
            status: "active",
          });
          if (subErr) throw subErr;
        }
      }

      toast.success(`Membre créé : ${inserted.first_name} ${inserted.last_name}`);
      resetForm();
      onSuccess?.();
      onCreated?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={handleClose} title="Nouveau membre" maxWidth="lg">
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Prénom *"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                required
              />
              <Input
                label="Nom *"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              <Input
                label="Téléphone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <Input
                label="Date de naissance"
                type="date"
                value={form.birthdate}
                onChange={(e) => update("birthdate", e.target.value)}
              />
              <Input
                label="Code membre"
                placeholder="Auto-généré si vide"
                value={form.member_code}
                onChange={(e) => update("member_code", e.target.value)}
              />
            </div>

            <Input
              label="Adresse"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />

            <div className="border-t border-white/10 pt-6">
              <label className="block text-sm font-medium text-white/80 mb-3">
                Carte RFID *
              </label>
              <div className="space-y-3">
                <Input
                  value={form.card_uid}
                  onChange={(e) => update("card_uid", e.target.value)}
                  placeholder="Scannez la carte ou saisissez l'UID"
                  required
                />
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
                  form.card_uid ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-[#0F2548] border border-white/10"
                }`}>
                  <CreditCard className={`w-5 h-5 ${form.card_uid ? "text-emerald-400" : "text-white/40"}`} />
                  <p className={`text-sm ${form.card_uid ? "text-emerald-400" : "text-white/60"}`}>
                    {form.card_uid ? `UID : ${form.card_uid}` : scanHint}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <label className="block text-sm font-medium text-white/80 mb-3">Options</label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Discipline</label>
                  <select
                    className="w-full rounded-xl bg-[#0F2548] text-white px-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={form.discipline}
                    onChange={(e) => update("discipline", e.target.value)}
                  >
                    {DISCIPLINES.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Statut</label>
                  <select
                    className="w-full rounded-xl bg-[#0F2548] text-white px-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 bg-[#0F2548] checked:bg-primary"
                      checked={form.is_competitor}
                      onChange={(e) => update("is_competitor", e.target.checked)}
                    />
                    <span className="text-sm">Compétiteur</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 bg-[#0F2548] checked:bg-primary"
                      checked={createFirstMonth}
                      onChange={(e) => setCreateFirstMonth(e.target.checked)}
                    />
                    <span className="text-sm">Créer un abonnement</span>
                  </label>
                </div>

                {createFirstMonth && (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <label className="block text-sm text-white/70 mb-2">
                      Plan d'abonnement *
                      <span className="ml-2 text-xs text-white/60">
                        ({DISCIPLINES.find((d) => d.slug === form.discipline)?.title || "Boxe"})
                      </span>
                    </label>
                    {availablePlans.length === 0 ? (
                      <p className="text-sm text-orange-400">Aucun plan disponible pour cette discipline</p>
                    ) : (
                      <>
                        <select
                          className="w-full rounded-xl bg-[#0F2548] text-white px-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={selectedPlanTitle}
                          onChange={(e) => setSelectedPlanTitle(e.target.value)}
                          required={createFirstMonth}
                        >
                          {availablePlans.map((plan) => (
                            <option key={plan.title} value={plan.title}>
                              {plan.title} → {plan.price}€
                            </option>
                          ))}
                        </select>
                        {selectedPlan && (
                          <p className="mt-2 text-sm text-emerald-400">
                            Prix : {selectedPlan.price.toFixed(2)}€
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400">
                Le lecteur RFID est actif. Scannez une carte pour remplir automatiquement l'UID.
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Créer le membre
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
