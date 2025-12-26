// src/features/members/MemberDetailsModal.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { X, Save, CreditCard, Trash2, Plus, Calendar, Activity } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { DISCIPLINES } from "../plans/catalog";
import { useKeyboardBuffer } from "../../utils/useKeyboardBuffer";

type Props = {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

// --- Types de données ---
type Member = {
  id: string;
  member_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: "active" | "inactive" | "suspended" | string;
  card_uid: string | null;
  last_scan_at: string | null;
};

type Discipline = { id: string; name: string };
type Plan = { id: string; name: string; price_cents: number | null; currency: string; discipline_id: string | null };

type Subscription = {
  id: string;
  member_id: string;
  plan_id: string | null;
  status: "active" | "expired" | "upcoming" | string;
  starts_at: string | null;
  ends_at: string | null;
  // Helpers
  plan_name?: string | null;
};

type Payment = {
  id: string;
  subscription_id: string | null;
  member_id: string;
  paid_at: string | null;
  amount_cents: number;
  currency: string;
  method: string | null;
  note: string | null;
  status: string;
};

type Checkin = {
  id: string;
  scanned_at: string;
  source: string | null;
  location: string | null;
};

const TabButton = ({ active, onClick, children }: any) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-xl text-sm ${active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10"}`}
  >
    {children}
  </button>
);

export function MemberDetailsModal({ memberId, open, onClose, onChanged }: Props) {
  const [tab, setTab] = useState<"infos" | "sub" | "payments" | "activity" | "notes">("infos");

  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [memberDisciplineIds, setMemberDisciplineIds] = useState<string[]>([]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  // Notes internes (audit_logs)
  const [noteText, setNoteText] = useState("");

  // Champs éditables (member)
  const [mCode, setMCode] = useState("");
  const [mUID, setMUID] = useState("");
  const [mFirst, setMFirst] = useState("");
  const [mLast, setMLast] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mStatus, setMStatus] = useState<Member["status"]>("active");

  // Champs abonnement
  const [sPlanName, setSPlanName] = useState<string>("");
  const [sPriceCents, setSPriceCents] = useState<number>(0);
  const [sStatus, setSStatus] = useState<Subscription["status"]>("active");
  const [sStart, setSStart] = useState<string>("");
  const [sEnd, setSEnd] = useState<string>("");
  const [sPaid, setSPaid] = useState<boolean>(false);
  const [sPaymentMethod, setSPaymentMethod] = useState<string>("carte");

  // Assurance annuelle
  const [insurancePaid, setInsurancePaid] = useState<boolean>(false);
  const [insurancePaymentMethod, setInsurancePaymentMethod] = useState<string>("carte");
  const INSURANCE_PRICE_CENTS = 4000; // 40€

  // Form nouveau paiement
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [newPaymentNote, setNewPaymentNote] = useState<string>("");
  const [newPaymentPaid, setNewPaymentPaid] = useState<boolean>(true);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("cash");

  // Scan carte RFID
  const [showCardModal, setShowCardModal] = useState(false);
  const [tempCardUID, setTempCardUID] = useState("");
  const [cardScanHint, setCardScanHint] = useState<string>("");

  const onCardScan = useCallback((raw: string) => {
    if (!showCardModal) return;
    const normalized = raw.replace(/[^0-9a-z]/gi, "").toUpperCase();
    if (!normalized) return;
    setTempCardUID(normalized);
    setCardScanHint(`✓ Carte scannée: ${normalized}`);
    setTimeout(() => setCardScanHint(""), 3000);
  }, [showCardModal]);

  useKeyboardBuffer(onCardScan);

  const handleSaveCard = useCallback(() => {
    if (!tempCardUID.trim()) return;
    setMUID(tempCardUID);
    setShowCardModal(false);
    setTempCardUID("");
    setCardScanHint("");
  }, [tempCardUID]);

  const currency = useMemo(() => sub?.plan_name ? "EUR" : "EUR", [sub]);

  // Obtenir tous les plans du catalogue
  const allAvailablePlans = useMemo(() => {
    const allPlans: Array<{ title: string; price: number; discipline: string }> = [];
    DISCIPLINES.forEach((disc) => {
      disc.plans.forEach((plan) => {
        allPlans.push({
          title: plan.title,
          price: plan.price,
          discipline: disc.title,
        });
      });
    });
    return allPlans;
  }, []);

  // Gestionnaire de changement de plan
  const handlePlanChange = (planTitle: string) => {
    const selectedPlan = allAvailablePlans.find((p) => p.title === planTitle);
    if (selectedPlan) {
      setSPlanName(planTitle);
      setSPriceCents(selectedPlan.price * 100);
    }
  };

  // Calculer le solde (total des paiements vs total dû)
  const memberBalance = useMemo(() => {
    // Séparer les paiements payés et non payés
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_cents, 0);

    let totalDue = 0;

    // Ajouter les paiements non payés au total dû (pending, due, unpaid, etc.)
    const unpaidPayments = payments
      .filter(p => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount_cents, 0);
    totalDue += unpaidPayments;

    // Ajouter le prix de l'abonnement si non payé
    if (sub && !sPaid) {
      totalDue += sPriceCents;
    }

    // Ajouter l'assurance si non payée
    if (!insurancePaid) {
      totalDue += INSURANCE_PRICE_CENTS;
    }

    return {
      totalPaid: totalPaid / 100,
      totalDue: totalDue / 100,
      balance: (totalPaid - totalDue) / 100,
    };
  }, [payments, sub, sPaid, sPriceCents, insurancePaid, INSURANCE_PRICE_CENTS]);

  // Fonction pour synchroniser le solde dans member_subscription_info
  const syncBalanceToDatabase = useCallback(async () => {
    if (!member?.member_code) {
      console.log('syncBalanceToDatabase: No member_code');
      return;
    }

    // Si le balance est négatif, cela signifie que le membre doit de l'argent
    // amountDue doit être positif pour représenter la dette
    const amountDue = memberBalance.totalDue - memberBalance.totalPaid;

    let paymentNote = '';
    const notes: string[] = [];

    if (sub && !sPaid) {
      notes.push(`Abonnement: ${(sPriceCents / 100).toFixed(2)}€`);
    }
    if (!insurancePaid) {
      notes.push('Assurance: 40.00€');
    }

    paymentNote = notes.join(', ') || 'Paiement en attente';

    console.log('Syncing balance to DB:', {
      member_code: member.member_code,
      amountDue,
      paymentNote,
      totalDue: memberBalance.totalDue,
      totalPaid: memberBalance.totalPaid
    });

    try {
      const { error } = await supabase
        .from('member_subscription_info')
        .update({
          amount_due: amountDue > 0 ? amountDue : 0,
          payment_note: amountDue > 0 ? paymentNote : null,
        })
        .eq('member_code', member.member_code);

      if (error) {
        console.error('Error syncing balance to DB:', error);
      } else {
        console.log('Balance synced successfully');
      }
    } catch (error) {
      console.error('Error syncing balance:', error);
    }
  }, [member, memberBalance, sub, sPaid, sPriceCents, insurancePaid]);

  // Synchroniser le solde quand il change
  useEffect(() => {
    if (open && member) {
      syncBalanceToDatabase();
    }
  }, [open, member, memberBalance, syncBalanceToDatabase]);

  // Charger tout
  const loadAll = useCallback(async () => {
    if (!memberId || !open) return;
    setLoading(true);
    try {
      // 1) Membre
      const { data: m, error: mErr } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!m) {
        console.error("Member not found:", memberId);
        return;
      }
      setMember(m as Member);

      // Pré-remplir inputs
      setMCode(m.member_code ?? "");
      setMUID(m.card_uid ?? "");
      setMFirst(m.first_name ?? "");
      setMLast(m.last_name ?? "");
      setMEmail(m.email ?? "");
      setMStatus((m.status as any) ?? "active");

      // 2) Disciplines + liens du membre
      const [{ data: dList }, { data: mdLinks }] = await Promise.all([
        supabase.from("disciplines").select("id, name").order("name"),
        supabase.from("member_disciplines").select("discipline_id").eq("member_id", memberId),
      ]);
      setDisciplines((dList ?? []) as Discipline[]);
      setMemberDisciplineIds((mdLinks ?? []).map((x: any) => x.discipline_id));

      // 3) Plans - Pas utilisé, on utilise DISCIPLINES du catalogue
      setPlans([]);

      // 4) Abonnement le plus récent
      const { data: sList } = await supabase
        .from("subscriptions")
        .select("id, member_id, plan_name, price_cents, status, starts_at, ends_at")
        .eq("member_id", memberId)
        .order("starts_at", { ascending: false })
        .limit(1);
      const latest = (sList?.[0] as any) || null;
      setSub(latest);

      // Pré-remplir inputs sub
      if (latest) {
        setSPlanName(latest.plan_name ?? "");
        setSPriceCents(latest.price_cents ?? 0);
        setSStatus(latest.status ?? "active");
        setSStart(latest.starts_at ? latest.starts_at.slice(0, 16) : "");
        setSEnd(latest.ends_at ? latest.ends_at.slice(0, 16) : "");

        // Vérifier si l'abonnement a été payé
        const { data: subPayments } = await supabase
          .from("payments")
          .select("amount_cents, method")
          .eq("subscription_id", latest.id)
          .order("paid_at", { ascending: false })
          .limit(1);

        if (subPayments && subPayments.length > 0) {
          setSPaid(true);
          setSPaymentMethod(subPayments[0].method ?? "carte");
        } else {
          setSPaid(false);
        }
      } else {
        // Initialiser avec le premier plan de la première discipline du membre
        if (mdLinks && mdLinks.length > 0) {
          const firstDisciplineId = mdLinks[0].discipline_id;
          const discipline = dList?.find((d: any) => d.id === firstDisciplineId);
          if (discipline) {
            const disciplineSlug = DISCIPLINES.find((disc) =>
              disc.title.toLowerCase().includes(discipline.name.toLowerCase())
            );
            if (disciplineSlug && disciplineSlug.plans.length > 0) {
              const firstPlan = disciplineSlug.plans[0];
              setSPlanName(firstPlan.title);
              setSPriceCents(firstPlan.price * 100);
            }
          }
        }
      }

      // 5) Paiements (20 derniers)
      const { data: payList } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", memberId)
        .order("paid_at", { ascending: false })
        .limit(20);
      setPayments((payList ?? []) as Payment[]);

      // Vérifier si l'assurance a été payée cette année
      const currentYear = new Date().getFullYear();
      const { data: insurancePayments } = await supabase
        .from("payments")
        .select("amount_cents, method")
        .eq("member_id", memberId)
        .eq("note", "Assurance annuelle")
        .gte("paid_at", `${currentYear}-01-01`)
        .order("paid_at", { ascending: false })
        .limit(1);

      if (insurancePayments && insurancePayments.length > 0) {
        setInsurancePaid(true);
        setInsurancePaymentMethod(insurancePayments[0].method ?? "carte");
      }

      // 6) Checkins (10 derniers)
      const { data: chk } = await supabase
        .from("checkins")
        .select("id, scanned_at, source, location")
        .eq("member_id", memberId)
        .order("scanned_at", { ascending: false })
        .limit(10);
      setCheckins((chk ?? []) as Checkin[]);
    } catch (e) {
      console.error("loadAll error:", e);
    } finally {
      setLoading(false);
    }
  }, [memberId, open]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Sauvegarde infos membre
  const saveMember = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    try {
      // Update members
      const { error: upErr } = await supabase
        .from("members")
        .update({
          member_code: mCode || null,
          card_uid: mUID || null,
          first_name: mFirst || null,
          last_name: mLast || null,
          email: mEmail || null,
          status: mStatus,
        })
        .eq("id", member.id);
      if (upErr) throw upErr;

      // Update member_disciplines (simple reset & insert)
      await supabase.from("member_disciplines").delete().eq("member_id", member.id);
      if (memberDisciplineIds.length) {
        const rows = memberDisciplineIds.map((d) => ({ member_id: member.id, discipline_id: d }));
        await supabase.from("member_disciplines").insert(rows);
      }

      await supabase.from("audit_logs").insert({
        actor: "admin",
        action: "member_updated",
        entity: "member",
        entity_id: member.id,
        meta: { fields: ["member_code","card_uid","first_name","last_name","email","status","disciplines"] },
      });

      onChanged?.();
      await loadAll();
    } catch (e) {
      console.error("saveMember error:", e);
      alert("Erreur lors de l'enregistrement du membre.");
    } finally {
      setLoading(false);
    }
  }, [member, mCode, mUID, mFirst, mLast, mEmail, mStatus, memberDisciplineIds, onChanged, loadAll]);

  // Sauvegarde abonnement - UNIQUEMENT SI PAYÉ
  const saveSubscription = useCallback(async () => {
    if (!member) return;
    if (!sPlanName) {
      alert("Sélectionne un plan.");
      return;
    }
    if (!sStart || !sEnd) {
      alert("Les dates de début et fin sont requises.");
      return;
    }

    // NOUVELLE LOGIQUE : L'abonnement n'est créé que si payé
    if (!sPaid) {
      alert("L'abonnement ne peut être créé que s'il est payé.\n\nUtilisez l'onglet 'Paiements' pour créer un paiement en attente si besoin.");
      return;
    }

    setLoading(true);
    try {
      let subscriptionId = sub?.id;

      console.log('Saving subscription (paid only):', {
        memberId: member.id,
        planName: sPlanName,
        priceCents: sPriceCents,
        status: sStatus,
        start: sStart,
        end: sEnd,
        paid: sPaid,
        updateMode: !!sub?.id
      });

      if (sub?.id) {
        // Mise à jour d'un abonnement existant
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_name: sPlanName,
            price_cents: sPriceCents,
            status: sStatus,
            starts_at: sStart || null,
            ends_at: sEnd || null,
          })
          .eq("id", sub.id);
        if (error) {
          console.error("Error updating subscription:", error);
          alert(`Erreur de mise à jour: ${error.message}`);
          throw error;
        }
        console.log('Subscription updated successfully');
      } else {
        // Création d'un nouvel abonnement - UNIQUEMENT SI PAYÉ
        const { data, error } = await supabase.from("subscriptions").insert({
          member_id: member.id,
          plan_name: sPlanName,
          price_cents: sPriceCents,
          status: sStatus,
          starts_at: sStart || new Date().toISOString().split('T')[0],
          ends_at: sEnd || null,
        }).select();
        if (error) {
          console.error("Error creating subscription:", error);
          alert(`Erreur de création: ${error.message}`);
          throw error;
        }
        subscriptionId = data?.[0]?.id;
        console.log('Subscription created with ID:', subscriptionId);
      }

      // Enregistrer le paiement de l'abonnement (obligatoire pour créer l'abonnement)
      if (subscriptionId) {
        console.log('Processing payment for subscription:', subscriptionId);

        // Vérifier si un paiement existe déjà pour cet abonnement
        const { data: existingPayment, error: checkError } = await supabase
          .from("payments")
          .select("id")
          .eq("subscription_id", subscriptionId)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking existing payment:", checkError);
        }

        if (!existingPayment) {
          const { error: paymentError } = await supabase.from("payments").insert({
            member_id: member.id,
            subscription_id: subscriptionId,
            paid_at: new Date().toISOString(),
            amount_cents: sPriceCents,
            currency: "EUR",
            method: sPaymentMethod,
            status: "paid",
            note: `Paiement ${sPlanName}`,
          });

          if (paymentError) {
            console.error("Error creating payment:", paymentError);
            alert(`Erreur d'enregistrement du paiement: ${paymentError.message}`);
            throw paymentError;
          }
          console.log('Payment recorded successfully');
        } else {
          console.log('Payment already exists for this subscription');
        }
      }

      const { error: auditError } = await supabase.from("audit_logs").insert({
        actor: "admin",
        action: "subscription_created",
        entity: "subscription",
        entity_id: subscriptionId ?? null,
        meta: { member_id: member.id, plan_name: sPlanName, price_cents: sPriceCents, status: sStatus },
      });

      if (auditError) {
        console.warn("Error creating audit log:", auditError);
      }

      console.log('Subscription and payment saved successfully');
      alert("Abonnement et paiement enregistrés avec succès !");
      onChanged?.();
      await loadAll();
      await syncBalanceToDatabase();
    } catch (e: any) {
      console.error("saveSubscription error:", e);
      const errorMessage = e?.message || e?.error_description || String(e);
      alert(`Erreur lors de l'enregistrement de l'abonnement.\n\nDétails: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [member, sub, sPlanName, sPriceCents, sStatus, sStart, sEnd, sPaid, sPaymentMethod, onChanged, loadAll, syncBalanceToDatabase]);

  // Enregistrer le paiement de l'assurance
  const saveInsurancePayment = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    try {
      if (insurancePaid) {
        // Vérifier si un paiement d'assurance existe déjà cette année
        const currentYear = new Date().getFullYear();
        const { data: existing } = await supabase
          .from("payments")
          .select("id")
          .eq("member_id", member.id)
          .eq("note", "Assurance annuelle")
          .gte("paid_at", `${currentYear}-01-01`)
          .maybeSingle();

        if (!existing) {
          await supabase.from("payments").insert({
            member_id: member.id,
            subscription_id: sub?.id ?? null,
            paid_at: new Date().toISOString(),
            amount_cents: INSURANCE_PRICE_CENTS,
            currency: "EUR",
            method: insurancePaymentMethod,
            note: "Assurance annuelle",
          });

          await supabase.from("audit_logs").insert({
            actor: "admin",
            action: "insurance_paid",
            entity: "payment",
            entity_id: null,
            meta: { member_id: member.id, amount_cents: INSURANCE_PRICE_CENTS },
          });
        }
      }

      onChanged?.();
      await loadAll();
      await syncBalanceToDatabase();
    } catch (e) {
      console.error("saveInsurancePayment error:", e);
      alert("Erreur lors de l'enregistrement du paiement d'assurance.");
    } finally {
      setLoading(false);
    }
  }, [member, sub, insurancePaid, insurancePaymentMethod, INSURANCE_PRICE_CENTS, onChanged, loadAll, syncBalanceToDatabase]);

  // Créer un nouveau paiement
  const createPayment = useCallback(async () => {
    if (!member) return;

    const amount = parseFloat(newPaymentAmount);
    if (!amount || amount <= 0) {
      alert("Montant invalide.");
      return;
    }

    setLoading(true);
    try {
      const paymentData: any = {
        member_id: member.id,
        subscription_id: null,
        amount_cents: Math.round(amount * 100),
        currency: "EUR",
        note: newPaymentNote.trim() || null,
        status: newPaymentPaid ? "paid" : "pending",
      };

      // Ajouter la méthode et date de paiement seulement si payé
      if (newPaymentPaid) {
        paymentData.method = newPaymentMethod;
        paymentData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase.from("payments").insert(paymentData);
      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        actor: "admin",
        action: "payment_created",
        entity: "payment",
        entity_id: null,
        meta: {
          member_id: member.id,
          amount_euros: amount,
          status: newPaymentPaid ? "paid" : "pending",
          method: newPaymentPaid ? newPaymentMethod : null,
          note: newPaymentNote.trim() || null
        },
      });

      // Réinitialiser le formulaire
      setNewPaymentAmount("");
      setNewPaymentNote("");
      setNewPaymentPaid(true);
      setNewPaymentMethod("cash");

      await loadAll();
      await syncBalanceToDatabase();
      onChanged?.();
    } catch (e: any) {
      console.error("createPayment error:", e);
      alert(`Erreur lors de la création du paiement: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [member, newPaymentAmount, newPaymentNote, newPaymentPaid, newPaymentMethod, onChanged, loadAll, syncBalanceToDatabase]);

  // Ajouter note interne
  const addNote = useCallback(async () => {
    if (!member) return;
    if (!noteText.trim()) return;
    setLoading(true);
    try {
      await supabase.from("audit_logs").insert({
        actor: "admin",
        action: "note",
        entity: "member",
        entity_id: member.id,
        meta: { text: noteText.trim() },
      });
      setNoteText("");
      await loadAll();
    } catch (e) {
      console.error("addNote error:", e);
      alert("Erreur lors de l’ajout de la note.");
    } finally {
      setLoading(false);
    }
  }, [member, noteText, loadAll]);

  // Supprimer membre
  const removeMember = useCallback(async () => {
    if (!member) return;
    if (!confirm("Supprimer définitivement ce membre ? (les enregistrements liés doivent être gérés manuellement)"))
      return;
    setLoading(true);
    try {
      // selon tes contraintes FK, il peut falloir supprimer d'abord subscriptions / payments / member_disciplines / checkins
      await supabase.from("member_disciplines").delete().eq("member_id", member.id);
      await supabase.from("checkins").delete().eq("member_id", member.id);
      await supabase.from("payments").delete().eq("member_id", member.id);
      await supabase.from("subscriptions").delete().eq("member_id", member.id);
      const { error } = await supabase.from("members").delete().eq("id", member.id);
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        actor: "admin",
        action: "member_deleted",
        entity: "member",
        entity_id: member.id,
      });

      onChanged?.();
      onClose();
    } catch (e) {
      console.error("removeMember error:", e);
      alert("Erreur lors de la suppression du membre.");
    } finally {
      setLoading(false);
    }
  }, [member, onChanged, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#142443] border border-white/10 shadow-2xl">
        {/* header - fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-xl font-semibold text-white">Éditer le membre</h3>
          <button className="p-2 rounded-lg hover:bg-white/10 text-white" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* tabs - fixed */}
        <div className="px-6 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2 flex-wrap">
              <TabButton active={tab === "infos"} onClick={() => setTab("infos")}>Infos</TabButton>
              <TabButton active={tab === "sub"} onClick={() => setTab("sub")}>Abonnement</TabButton>
              <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>Paiements</TabButton>
              <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>Activité</TabButton>
              <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>Notes</TabButton>
            </div>

            {/* Affichage du solde */}
            <div className={`px-4 py-2 rounded-xl border flex-shrink-0 ${
              memberBalance.balance >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <div className="text-xs font-medium">Solde</div>
              <div className="text-lg font-bold">
                {memberBalance.balance >= 0 ? '+' : ''}{memberBalance.balance.toFixed(2)}€
              </div>
            </div>
          </div>

          {/* Détails du solde */}
          {memberBalance.balance < 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-sm space-y-2">
              <div className="flex items-center justify-between text-rose-300">
                <span>Total payé:</span>
                <span className="font-semibold">{memberBalance.totalPaid.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between text-rose-300">
                <span>Total dû:</span>
                <span className="font-semibold">{memberBalance.totalDue.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between text-rose-200 pt-2 border-t border-rose-500/20">
                <span className="font-bold">Reste à payer:</span>
                <span className="font-bold">{Math.abs(memberBalance.balance).toFixed(2)}€</span>
              </div>

              {/* Détail de ce qui est dû */}
              <div className="pt-2 border-t border-rose-500/20">
                <p className="text-xs text-rose-300/80 mb-1.5">Détail des montants dus:</p>
                <div className="space-y-1">
                  {!sPaid && sub && (
                    <div className="flex justify-between text-xs text-rose-300/90">
                      <span>• Abonnement ({sPlanName})</span>
                      <span>{(sPriceCents / 100).toFixed(2)}€</span>
                    </div>
                  )}
                  {!insurancePaid && (
                    <div className="flex justify-between text-xs text-rose-300/90">
                      <span>• Assurance annuelle</span>
                      <span>40.00€</span>
                    </div>
                  )}
                  {payments.filter(p => p.status !== 'paid').map(p => (
                    <div key={p.id} className="flex justify-between text-xs text-rose-300/90">
                      <span>• {p.note || 'Paiement en attente'}</span>
                      <span>{(p.amount_cents / 100).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* body - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* === INFOS === */}
          {tab === "infos" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Code</label>
                  <input className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                    value={mCode} onChange={e => setMCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Carte membre</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-white text-sm">
                        {mUID || "Aucune carte"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTempCardUID(mUID);
                          setShowCardModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span className="hidden sm:inline">Changer</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300">Prénom</label>
                  <input className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                    value={mFirst} onChange={e => setMFirst(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Nom</label>
                  <input className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                    value={mLast} onChange={e => setMLast(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-300">Email</label>
                  <input className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                    value={mEmail} onChange={e => setMEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Statut</label>
                  <select className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                    value={mStatus} onChange={e => setMStatus(e.target.value as any)}>
                    <option value="active">actif</option>
                    <option value="inactive">inactif</option>
                    <option value="suspended">suspendu</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-300">Dernier scan</label>
                  <div className="w-full bg-white/10 text-white rounded-xl px-3 py-2">
                    {member?.last_scan_at ? new Date(member.last_scan_at).toLocaleString("fr-BE") : "Jamais"}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <label className="text-sm text-slate-300 block mb-2">Disciplines</label>
                <div className="flex flex-wrap gap-3">
                  {disciplines.map((d) => {
                    const checked = memberDisciplineIds.includes(d.id);
                    return (
                      <label key={d.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-500"
                          checked={checked}
                          onChange={(e) => {
                            setMemberDisciplineIds((prev) =>
                              e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                            );
                          }}
                        />
                        {d.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={saveMember} disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
                <button onClick={removeMember} disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>
          )}

          {/* === ABONNEMENT === */}
          {tab === "sub" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-300 font-medium block mb-2">Plan</label>
                  <select
                    className="w-full bg-white/10 text-white rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sPlanName}
                    onChange={(e) => handlePlanChange(e.target.value)}
                  >
                    <option value="">— Sélectionner un plan —</option>
                    {DISCIPLINES.map((disc) => (
                      <optgroup key={disc.slug} label={disc.title}>
                        {disc.plans.map((plan) => (
                          <option key={plan.title} value={plan.title}>
                            {plan.title} → {plan.price}€
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {sPlanName && (
                    <p className="mt-2 text-sm text-emerald-400">
                      Prix : {(sPriceCents / 100).toFixed(2)}€
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-slate-300">Statut</label>
                  <select className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                          value={sStatus} onChange={(e)=>setSStatus(e.target.value as any)}>
                    <option value="active">actif</option>
                    <option value="upcoming">à venir</option>
                    <option value="expired">expiré</option>
                  </select>
                </div>
                <div className="invisible"></div>
                <div>
                  <label className="text-sm text-slate-300">Début</label>
                  <input type="datetime-local" className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                         value={sStart} onChange={(e)=>setSStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Fin</label>
                  <input type="datetime-local" className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                         value={sEnd} onChange={(e)=>setSEnd(e.target.value)} />
                </div>
              </div>

              {/* Paiement de l'abonnement */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <h4 className="text-white font-semibold">Paiement de l'abonnement</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-500"
                        checked={sPaid}
                        onChange={(e) => setSPaid(e.target.checked)}
                      />
                      <span className={sPaid ? "text-emerald-400" : "text-rose-400"}>
                        {sPaid ? "✓ Payé" : "✗ Non payé"}
                      </span>
                    </label>
                  </div>
                  {sPaid && (
                    <div>
                      <label className="text-sm text-slate-300">Méthode de paiement</label>
                      <select
                        className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                        value={sPaymentMethod}
                        onChange={(e) => setSPaymentMethod(e.target.value)}
                      >
                        <option value="carte">Carte</option>
                        <option value="cash">Cash</option>
                        <option value="virement">Virement</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Assurance annuelle */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <h4 className="text-white font-semibold">Assurance annuelle (40€)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-500"
                        checked={insurancePaid}
                        onChange={(e) => setInsurancePaid(e.target.checked)}
                      />
                      <span className={insurancePaid ? "text-emerald-400" : "text-rose-400"}>
                        {insurancePaid ? "✓ Payée" : "✗ Non payée"}
                      </span>
                    </label>
                  </div>
                  {insurancePaid && (
                    <div>
                      <label className="text-sm text-slate-300">Méthode de paiement</label>
                      <select
                        className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                        value={insurancePaymentMethod}
                        onChange={(e) => setInsurancePaymentMethod(e.target.value)}
                      >
                        <option value="carte">Carte</option>
                        <option value="cash">Cash</option>
                        <option value="virement">Virement</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={saveInsurancePayment} disabled={loading || !insurancePaid}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  <CreditCard className="w-4 h-4" /> Enregistrer l'assurance
                </button>
                <button onClick={saveSubscription} disabled={loading || !sPaid}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  <Calendar className="w-4 h-4" /> {sPaid ? "Créer abonnement + paiement" : "⚠ Cocher 'Payé' pour créer"}
                </button>
              </div>
            </div>
          )}

          {/* === PAIEMENTS === */}
          {tab === "payments" && (
            <div className="space-y-6">
              {/* Nouveau paiement */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h4 className="text-white font-semibold mb-4">Créer un paiement</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-300 block mb-2">Montant (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                        value={newPaymentAmount}
                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 block mb-2">Statut</label>
                      <label className="inline-flex items-center gap-2 text-white cursor-pointer w-full bg-white/10 rounded-xl px-3 py-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-emerald-500"
                          checked={newPaymentPaid}
                          onChange={(e) => setNewPaymentPaid(e.target.checked)}
                        />
                        <span className={newPaymentPaid ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                          {newPaymentPaid ? "✓ Payé" : "✗ Non payé"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {newPaymentPaid && (
                    <div>
                      <label className="text-sm text-slate-300 block mb-2">Méthode de paiement</label>
                      <select
                        className="w-full bg-white/10 text-white rounded-xl px-3 py-2"
                        value={newPaymentMethod}
                        onChange={(e) => setNewPaymentMethod(e.target.value)}
                      >
                        <option value="cash">Cash</option>
                        <option value="carte">Carte</option>
                        <option value="virement">Virement</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-slate-300 block mb-2">Notes / Description</label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Paiement abonnement mensuel, Frais de carte, etc."
                      className="w-full bg-white/10 text-white rounded-xl px-3 py-2 resize-none"
                      value={newPaymentNote}
                      onChange={(e) => setNewPaymentNote(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={createPayment}
                      disabled={loading || !newPaymentAmount || parseFloat(newPaymentAmount) <= 0}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="w-4 h-4" /> Créer le paiement
                    </button>
                  </div>
                </div>
              </div>

              {/* Historique des paiements */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h4 className="text-white font-semibold mb-3">Historique des paiements</h4>
                <div className="space-y-2">{payments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      Aucun paiement enregistré
                    </div>
                  ) : (
                    payments.map((p) => (
                      <div key={p.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-semibold">
                              {((p.amount_cents || 0) / 100).toFixed(2)}€
                            </span>
                            <span className={p.status === 'paid' ? "text-emerald-400 text-sm" : "text-rose-400 text-sm"}>
                              {p.status === 'paid' ? '✓ Payé' : '✗ Non payé'}
                            </span>
                            {p.method && p.status === 'paid' && (
                              <span className="text-slate-400 text-sm">• {p.method}</span>
                            )}
                          </div>
                          {p.note && (
                            <div className="text-sm text-slate-300 mt-1">{p.note}</div>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            {p.paid_at ? new Date(p.paid_at).toLocaleString("fr-BE") : 'Date non définie'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === ACTIVITÉ === */}
          {tab === "activity" && (
            <div className="space-y-3">
              <h4 className="text-white font-semibold mb-2">Derniers check-ins</h4>
              <ul className="space-y-2">
                {checkins.length === 0 ? (
                  <li className="text-slate-400">Aucun check-in</li>
                ) : checkins.map(c => (
                  <li key={c.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="p-2 rounded-xl bg-accent/20">
                      <Activity className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-white">
                      <div className="font-medium">{new Date(c.scanned_at).toLocaleString("fr-BE")}</div>
                      <div className="text-sm text-slate-300">
                        {c.source ?? "rfid"} • {c.location ?? "-"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* === NOTES === */}
          {tab === "notes" && (
            <div className="space-y-3">
              <label className="text-sm text-slate-300">Ajouter une note interne</label>
              <textarea
                className="w-full min-h-[120px] bg-white/10 text-white rounded-xl px-3 py-2"
                placeholder="Ex: blessures, aménagements, particularités…"
                value={noteText}
                onChange={(e)=>setNoteText(e.target.value)}
              />
              <div className="flex justify-end">
                <button onClick={addNote} disabled={loading || !noteText.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4" /> Enregistrer la note
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Les notes sont stockées dans <code>audit_logs</code> (action=<code>note</code>).
              </p>
            </div>
          )}
        </div>

        {/* footer simple - fixed */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end flex-shrink-0">
          <button className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15" onClick={onClose}>
            Fermer
          </button>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
            <div className="px-4 py-2 rounded-xl bg-[#0F2548] border border-white/10 text-white">Chargement…</div>
          </div>
        )}
      </div>

      {/* Modal Changer Carte */}
      {showCardModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCardModal(false)} />
          <div className="relative w-full max-w-md bg-[#142443] rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Changer la carte membre</h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-slate-300 block mb-2">UID de la carte</label>
                <input
                  type="text"
                  className="w-full bg-white/10 text-white rounded-xl px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={tempCardUID}
                  onChange={(e) => setTempCardUID(e.target.value.toUpperCase())}
                  placeholder="Scannez ou saisissez l'UID"
                />
              </div>
              {cardScanHint ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm text-emerald-400">{cardScanHint}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <p className="text-sm text-blue-400">
                    Scannez une carte RFID ou saisissez l'UID manuellement
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCard}
                disabled={!tempCardUID.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberDetailsModal;