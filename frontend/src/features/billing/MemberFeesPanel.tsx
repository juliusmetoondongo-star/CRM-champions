// src/features/billing/MemberFeesPanel.tsx
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import {
  payAnnualInsurance,
  issueFirstCard,
  replaceCard,
  fetchMemberPayments,
  hasFirstCardPaid,
  hasInsuranceThisYear,
  MemberPayment,
} from "./api";
import { useKeyboardScan } from "../scan/useKeyboardScan";
import { useToast } from "../../hooks/useToast";
import { Shield, CreditCard, RefreshCw, Clock, FileText } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

interface MemberFeesPanelProps {
  memberId: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function MemberFeesPanel({ memberId }: MemberFeesPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [insurancePaid, setInsurancePaid] = useState<boolean | null>(null);
  const [firstCardPaid, setFirstCardPaid] = useState<boolean | null>(null);
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [pendingAction, setPendingAction] = useState<"ISSUE" | "REPLACE" | null>(null);

  // loading par paiement pour la génération du reçu
  const [receiptsLoading, setReceiptsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [memberId]);

  async function loadData() {
    try {
      const [insurance, card, paymentsData] = await Promise.all([
        hasInsuranceThisYear(memberId),
        hasFirstCardPaid(memberId),
        fetchMemberPayments(memberId),
      ]);
      setInsurancePaid(insurance);
      setFirstCardPaid(card);
      setPayments(paymentsData);
    } catch (error: any) {
      console.error("Error loading fees data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  }

  useKeyboardScan(
    async (uid) => {
      if (!pendingAction) return;

      try {
        setLoading(true);
        if (pendingAction === "ISSUE") {
          await issueFirstCard(memberId, uid, "cash");
          toast.success("1ʳᵉ carte émise avec succès");
          setFirstCardPaid(true);
        } else {
          await replaceCard(memberId, uid, "cash");
          toast.success("Carte remplacée avec succès");
        }
        await loadData();
      } catch (error: any) {
        toast.error(error.message ?? "Erreur lors de l'opération");
      } finally {
        setLoading(false);
        setPendingAction(null);
      }
    },
    pendingAction !== null
  );

  async function onPayInsurance() {
    try {
      setLoading(true);
      await payAnnualInsurance(memberId, new Date().getFullYear(), "cash");
      toast.success("Assurance annuelle enregistrée");
      setInsurancePaid(true);
      await loadData();
    } catch (error: any) {
      toast.error(error.message ?? "Erreur lors du paiement");
    } finally {
      setLoading(false);
    }
  }

  // --- Génération et téléchargement du reçu PDF via Edge Function ---
  async function onDownloadReceipt(payment: MemberPayment) {
    try {
      setReceiptsLoading((s) => ({ ...s, [payment.id]: true }));

      // 1) tentative "confort" : on espère un JSON (url signée OU base64)
      const { data, error } = await supabase.functions.invoke("generate_receipt_pdf", {
        body: { payment_id: payment.id },
        headers: { Accept: "application/json" },
      });
      if (error) throw new Error(error.message);

      // Cas A : URL signée
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Reçu prêt 👍");
        return;
      }

      // Cas B : base64 inline
      if (data?.pdf_base64) {
        const byteChars = atob(data.pdf_base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
        downloadBlob(blob, data.filename || `receipt-${payment.id}.pdf`);
        toast.success("Reçu téléchargé ✅");
        return;
      }

      // 2) Fallback "brut" : la function renvoie directement un PDF binaire
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Session non trouvée");

      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate_receipt_pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/pdf",
        },
        body: JSON.stringify({ payment_id: payment.id }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Erreur HTTP ${res.status}`);
      }

      const blob = await res.blob();
      // Essaye de récupérer un nom depuis Content-Disposition
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/.exec(cd);
      const filename = decodeURIComponent(match?.[1] || match?.[2] || `receipt-${payment.id}.pdf`);

      downloadBlob(blob, filename);
      toast.success("Reçu téléchargé ✅");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Impossible de générer le reçu");
    } finally {
      setReceiptsLoading((s) => ({ ...s, [payment.id]: false }));
    }
  }

  function getPaymentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      INSURANCE: "Assurance annuelle",
      CARD_ISSUE: "Émission carte",
      CARD_REPLACEMENT: "Remplacement carte",
      SUBSCRIPTION: "Abonnement",
    };
    return labels[type] || "Paiement";
  }

  function formatDate(date: string | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatAmount(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Frais & Carte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={loading || insurancePaid === true}
            onClick={onPayInsurance}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            {insurancePaid
              ? "Assurance payée (année en cours)"
              : "Encaisser assurance (40€)"}
          </Button>

          <Button
            disabled={loading || firstCardPaid === true || pendingAction !== null}
            onClick={() => {
              setPendingAction("ISSUE");
              toast.info("Scannez la carte pour l'émission...");
            }}
            className="bg-sky-600 hover:bg-sky-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {firstCardPaid ? "1ʳᵉ carte déjà payée" : "Émettre 1ʳᵉ carte (20€)"}
          </Button>

          <Button
            disabled={loading || pendingAction !== null}
            onClick={() => {
              setPendingAction("REPLACE");
              toast.info("Scannez la nouvelle carte (remplacement 20€)...");
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Remplacer la carte (20€)
          </Button>
        </div>

        {pendingAction && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <Clock className="w-5 h-5 animate-pulse" />
              <p className="text-sm font-medium">
                En attente d'un scan de carte… Scannez la carte puis appuyez sur Enter
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPendingAction(null)}
              className="mt-3"
            >
              Annuler
            </Button>
          </div>
        )}

        <div className="border-t border-white/10 pt-6">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Historique des paiements
          </h4>
          <div className="space-y-2">
            {payments.length === 0 ? (
              <div className="text-white/60 text-sm text-center py-8">
                Aucun paiement enregistré
              </div>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white flex flex-wrap items-center gap-2">
                      {getPaymentTypeLabel(payment.meta?.type || "")}
                      <span className="text-white/60">·</span>
                      <span className="text-primary-light">
                        {formatAmount(payment.amount_cents)} {payment.currency}
                      </span>
                    </div>
                    <div className="text-sm text-white/60 mt-1">
                      {formatDate(payment.paid_at)} · {payment.method || "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={payment.status === "paid" ? "success" : "neutral"}
                      className="text-xs"
                    >
                      {payment.status}
                    </Badge>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onDownloadReceipt(payment)}
                      loading={!!receiptsLoading[payment.id]}
                      title="Télécharger le reçu PDF"
                      className="ml-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Reçu PDF
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}