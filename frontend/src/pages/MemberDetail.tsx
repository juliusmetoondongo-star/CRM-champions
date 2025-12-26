import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Loading } from "../components/ui/Loading";
import { useToast } from "../hooks/useToast";
import { ArrowLeft, Save, Trash2, CreditCard, Calendar, User, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogFooter } from "../components/ui/Dialog";
import { SubscriptionModal } from "../features/members/SubscriptionModal";
import { MemberFeesPanel } from "../features/billing/MemberFeesPanel";
import { DISCIPLINES } from "../features/plans/catalog";
import { StatusBadge } from "../components/StatusBadge";        // ⬅️ NEW
import { Timeline } from "../components/Timeline";              // ⬅️ NEW

interface MemberDetailProps {
  memberId: string;
  onBack: () => void;
}

type TimelineEvent =
  | { kind: "checkin"; ts: string; data: { location?: string; source?: string } }
  | { kind: "payment"; ts: string; data: { amount_cents: number; currency?: string; method?: string; category?: string; discipline?: string } }
  | { kind: "subscription"; ts: string; data: { plan_name?: string; discipline?: string; ends_at?: string; status?: string } };

interface Member {
  id: string;
  member_code: string;
  card_uid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  address: string | null;
  status: string;
  is_competitor: boolean;
  discipline: string | null;
  last_scan_at: string | null;
  computed_status?: string | null; // ⬅️ NEW (statut calculé)
}

interface Subscription {
  id: string;
  plan_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

export function MemberDetail({ memberId, onBack }: MemberDetailProps) {
  const { toast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);    // ⬅️ NEW
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birthdate: "",
    address: "",
    card_uid: "",
    member_code: "",
    status: "active" as "active" | "inactive" | "suspended",
    is_competitor: false,
    discipline: "boxe",
  });

  useEffect(() => {
    loadMember();
  }, [memberId]);

  async function loadMember() {
    setLoading(true);
    try {
      // 1) Données membre (table principale)
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .single();
      if (memberError) throw memberError;

      // 2) Statut calculé (vue)
      const { data: vms } = await supabase
        .from("v_member_status")
        .select("id, computed_status")
        .eq("id", memberId)
        .maybeSingle();

      const computed_status = vms?.computed_status ?? null;

      const mergedMember: Member = {
        ...memberData,
        computed_status,
      };

      setMember(mergedMember);
      setForm({
        first_name: mergedMember.first_name || "",
        last_name: mergedMember.last_name || "",
        email: mergedMember.email || "",
        phone: mergedMember.phone || "",
        birthdate: mergedMember.birthdate || "",
        address: mergedMember.address || "",
        card_uid: mergedMember.card_uid || "",
        member_code: mergedMember.member_code || "",
        status: mergedMember.status,
        is_competitor: mergedMember.is_competitor || false,
        discipline: mergedMember.discipline || "boxe",
      });

      // 3) Abonnements
      const { data: subsData, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("member_id", memberId)
        .order("ends_at", { ascending: false });
      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      // 4) Timeline via RPC (fallback si indispo)
      const rpc = await supabase.rpc("member_timeline", { p_member: memberId });
      if (!rpc.error && Array.isArray(rpc.data)) {
        setTimeline(rpc.data as TimelineEvent[]);
      } else {
        const [cRes, sRes, pRes] = await Promise.all([
          supabase
            .from("checkins")
            .select("scanned_at, location, source")
            .eq("member_id", memberId)
            .order("scanned_at", { ascending: false })
            .limit(100),
          supabase
            .from("subscriptions")
            .select("starts_at, ends_at, plan_name, discipline, status")
            .eq("member_id", memberId)
            .order("starts_at", { ascending: false })
            .limit(50),
          supabase
            .from("payments")
            .select("paid_at, amount_cents, currency, method, category, discipline")
            .eq("member_id", memberId)
            .order("paid_at", { ascending: false })
            .limit(100),
        ]);

        const flat: TimelineEvent[] = [
          ...(cRes.data || []).map((x: any) => ({
            kind: "checkin" as const,
            ts: x.scanned_at,
            data: { location: x.location, source: x.source },
          })),
          ...(sRes.data || []).map((x: any) => ({
            kind: "subscription" as const,
            ts: x.starts_at,
            data: {
              plan_name: x.plan_name,
              discipline: x.discipline,
              ends_at: x.ends_at,
              status: x.status,
            },
          })),
          ...(pRes.data || []).map((x: any) => ({
            kind: "payment" as const,
            ts: x.paid_at,
            data: {
              amount_cents: x.amount_cents,
              currency: x.currency,
              method: x.method,
              category: x.category,
              discipline: x.discipline,
            },
          })),
        ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

        setTimeline(flat);
      }
    } catch (error: any) {
      console.error("Error loading member:", error);
      toast.error("Erreur lors du chargement du membre");
    } finally {
      setLoading(false);
    }
  }

  const update = (k: keyof typeof form, v: any) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Prénom et nom requis");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birthdate: form.birthdate || null,
        address: form.address.trim() || null,
        card_uid: form.card_uid.trim() || null,
        member_code: form.member_code.trim() || null,
        status: form.status,
        is_competitor: form.is_competitor,
        discipline: form.discipline,
      };

      const { error } = await supabase
        .from("members")
        .update(payload)
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Membre mis à jour");
      await loadMember();
    } catch (error: any) {
      console.error("Error updating member:", error);
      toast.error(error?.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("members").delete().eq("id", memberId);
      if (error) throw error;

      toast.success("Membre supprimé");
      setDeleteModalOpen(false);
      onBack();
    } catch (error: any) {
      console.error("Error deleting member:", error);
      toast.error(error?.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "Jamais";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getSubscriptionBadge(status: string, endsAt: string) {
    const isExpired = new Date(endsAt) < new Date();
    if (isExpired) return <Badge variant="danger">Expiré</Badge>;
    if (status === "active") return <Badge variant="success">Actif</Badge>;
    return <Badge variant="neutral">{status}</Badge>;
  }

  if (loading) {
    return <Loading />;
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60">Membre introuvable</p>
        <Button onClick={onBack} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">
                {member.first_name} {member.last_name}
              </h1>
              {/* ⬇️ Badge de statut (calculé si dispo) */}
              <StatusBadge status={member.computed_status ?? member.status} />
            </div>
            <p className="text-muted">Code: {member.member_code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  value={form.member_code}
                  onChange={(e) => update("member_code", e.target.value)}
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Adresse"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Carte RFID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="UID de la carte"
                value={form.card_uid}
                onChange={(e) => update("card_uid", e.target.value)}
              />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-2">Discipline</label>
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
                  <label className="block text-sm text-white/80 mb-2">Statut</label>
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

                <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-[#0F2548] checked:bg-primary"
                    checked={form.is_competitor}
                    onChange={(e) => update("is_competitor", e.target.checked)}
                  />
                  <span className="text-sm">Compétiteur</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* ⬇️ NEW — Timeline */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={timeline} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Abonnements
                </CardTitle>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSubscriptionModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-white/60 mb-3">Aucun abonnement</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSubscriptionModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-[#0F2548] rounded-xl border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{sub.plan_name}</span>
                        {getSubscriptionBadge(sub.status, sub.ends_at)}
                      </div>
                      <div className="text-xs text-white/60 space-y-1">
                        <div>
                          Début: {new Date(sub.starts_at).toLocaleDateString("fr-FR")}
                        </div>
                        <div>
                          Fin: {new Date(sub.ends_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Dernier scan</span>
                  <span className="text-white">{formatDate(member.last_scan_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Statut</span>
                  {/* ⬇️ NEW — StatusBadge au lieu de Badge simple */}
                  <span className="text-white">
                    <StatusBadge status={member.computed_status ?? member.status} />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MemberFeesPanel memberId={memberId} />

      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer le membre"
      >
        <DialogBody>
          <p className="text-white/80">
            Êtes-vous sûr de vouloir supprimer{" "}
            <strong className="text-white">
              {member.first_name} {member.last_name}
            </strong>{" "}
            ?
          </p>
          <p className="text-white/60 text-sm mt-2">
            Cette action est irréversible. Tous les abonnements, check-ins et paiements
            associés seront également supprimés.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </Dialog>

      <SubscriptionModal
        open={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        onSuccess={loadMember}
        memberId={memberId}
      />
    </div>
  );
}