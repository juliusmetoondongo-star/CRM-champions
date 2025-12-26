// src/pages/ScanPage.tsx
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Scan, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { playAccessGranted, playAccessDenied } from "../utils/soundPlayer";

/* ---------------- Types ---------------- */
type ScanApiResponse = {
  ok?: boolean;
  success?: boolean;
  allowed?: boolean;
  reason?: string | null;
  message: string;
  balance_cents?: number | null;
  member?: {
    id?: string;
    first_name: string;
    last_name: string;
    member_code: string;
  } | null;
  plan?: {
    discipline?: string | null;
    name?: string | null;
    ends_at?: string | null;
  } | null;
  balance?: {
    amount_due: number;
    note: string;
  } | null;
};

type ScanResult = {
  allowed: boolean;
  message: string;
  reason?: string | null;
  balance_cents?: number | null;
  member?: {
    first_name: string;
    last_name: string;
    member_code: string;
  } | null;
  plan?: {
    discipline?: string | null;
    name?: string | null;
    ends_at?: string | null;
  } | null;
  balance?: {
    amount_due: number;
    note: string;
  } | null;
};

const fmtEUR = (cents?: number | null) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format((cents ?? 0) / 100);

/* ---------------- Composant principal ---------------- */
export function ScanPage() {
  const [buffer, setBuffer] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [location] = useState("Ixelles");

  // Lecture clavier (RFID mode HID)
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (scanning) return;

      if (e.key === "Enter") {
        const value = buffer.trim();
        if (value.length > 0) {
          processInput(value);
          setBuffer("");
        }
      } else if (e.key && e.key.length === 1) {
        setBuffer((prev) => prev + e.key);
      } else if (e.key === "Backspace") {
        setBuffer((prev) => prev.slice(0, -1));
      }
    }

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [buffer, scanning]);

  async function processInput(input: string) {
    setScanning(true);
    setResult(null);

    try {
      const normalized = input.toUpperCase().trim();
      const apiRes = await sendScan(normalized, location);

      const mapped: ScanResult = {
        allowed: Boolean(apiRes.allowed ?? apiRes.success),
        message: apiRes.message,
        reason: apiRes.reason ?? null,
        balance_cents: apiRes.balance_cents ?? null,
        member: apiRes.member ?? undefined,
        plan: apiRes.plan ?? undefined,
        balance: apiRes.balance ?? null,
      };

      // Si le solde est négatif → accès refusé
      if ((mapped.balance_cents ?? 0) < 0) {
        mapped.allowed = false;
        mapped.reason = "negative_balance";
        mapped.message = "Accès refusé : solde négatif.";
      }

      // Jouer le son approprié
      if (mapped.allowed) {
        playAccessGranted();
      } else {
        playAccessDenied();
      }

      setResult(mapped);
      setTimeout(() => setResult(null), 5000);
    } catch (error: any) {
      playAccessDenied();
      setResult({
        allowed: false,
        message: error?.message || "Erreur de connexion au serveur",
      });
    } finally {
      setScanning(false);
    }
  }

  /** Appel Supabase Edge Function (nommée “scan”) */
// remplace TOUTE la fonction sendScan(...) par ceci
async function sendScan(value: string, location: string): Promise<ScanApiResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan`;
  const payload = { uid: value, code: value, location };

  // 1) Essai via supabase-js (gère l’URL) AVEC header Authorization
  try {
    // @ts-ignore - supabase.functions.invoke accepte headers
    const { data, error } = await (supabase as any).functions.invoke("scan", {
      body: payload,
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    });
    if (!error && data) return data as ScanApiResponse;
    if (error) throw new Error(error.message || "invoke failed");
  } catch (e) {
    // on tente un fallback fetch pour voir l’erreur réseau réelle
  }

  // 2) Fallback: fetch avec logs détaillés (CORS/HTTPS/JSON)
  try {
    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text(); // on lit d’abord le texte pour log
    let json: any;
    try { json = rawText ? JSON.parse(rawText) : null; } catch { json = null; }

    if (!res.ok) {
      return { message: json?.message || `HTTP ${res.status} ${res.statusText} · ${rawText?.slice(0,200)}` };
    }
    return (json || { message: "Réponse vide" }) as ScanApiResponse;
  } catch (err: any) {
    return { message: err?.message || "Network error (CORS/HTTPS)" };
  }
}
  const balanceIsNeg = (result?.balance_cents ?? 0) < 0;

  /* ---------------- Rendu UI ---------------- */
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Scanner RFID / Code membre</h1>
        <p className="text-muted">Scannez une carte ou tapez un code membre puis &laquo; Entrée &raquo;</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>État du scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <Scan className={`w-24 h-24 ${scanning ? "text-blue-400 animate-pulse" : "text-neutral-400"}`} />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <p className="text-lg font-semibold text-white mb-2">
                  {scanning ? "Scan en cours..." : "En attente d'un scan / code"}
                </p>
                <p className="text-sm text-neutral-400">
                  Lieu : <span className="font-medium text-white">{location}</span>
                </p>
              </div>

              {buffer.length > 0 && !scanning && (
                <div className="mt-4 px-4 py-2 bg-[#0F2548] rounded-xl">
                  <p className="text-xs text-neutral-400 mb-1">Buffer</p>
                  <p className="font-mono text-white">{buffer}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résultat du scan</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex items-center justify-center py-12 text-neutral-400">
                <p>Aucun résultat pour le moment</p>
              </div>
            ) : (
              <div
                className={`p-6 rounded-2xl ${
                  result.allowed && !balanceIsNeg
                    ? "bg-green-500/10 border-2 border-green-500/30"
                    : "bg-red-500/10 border-2 border-red-500/30"
                }`}
              >
                <div className="flex items-center gap-4 mb-4">
                  {result.allowed && !balanceIsNeg ? (
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-400" />
                  )}
                  <div>
                    <h3
                      className={`text-xl font-bold ${
                        result.allowed && !balanceIsNeg ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {result.allowed && !balanceIsNeg ? "Accès autorisé" : "Accès refusé"}
                    </h3>
                    <p className="text-sm text-neutral-300 mt-1">
                      {balanceIsNeg
                        ? "Solde négatif — accès refusé. Régulariser à l'accueil."
                        : result.message}
                    </p>

                    {result.balance && result.balance.amount_due > 0 && (
                      <div className="mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-red-300 font-semibold text-sm">
                              Solde dû : {result.balance.amount_due}€
                            </p>
                            <p className="text-red-200 text-xs mt-1">
                              {result.balance.note}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {typeof result.balance_cents === "number" && !result.balance && (
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-lg text-xs border ${
                            balanceIsNeg
                              ? "bg-rose-500/10 text-rose-300 border-rose-400/20"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-400/20"
                          }`}
                        >
                          Solde&nbsp;: {fmtEUR(result.balance_cents)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {(result.member || result.plan) && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {result.member && (
                      <div>
                        <p className="text-neutral-400">Membre</p>
                        <p className="text-white font-medium">
                          {result.member.first_name} {result.member.last_name}
                        </p>
                        <p className="text-neutral-400 mt-1">Code</p>
                        <p className="text-white font-mono">{result.member.member_code}</p>
                      </div>
                    )}

                    {result.plan && (
                      <div>
                        <p className="text-neutral-400">Plan</p>
                        <p className="text-white font-medium">{result.plan.name || "—"}</p>
                        <p className="text-neutral-400 mt-1">Discipline</p>
                        <p className="text-white">{result.plan.discipline || "—"}</p>
                        <p className="text-neutral-400 mt-1">Fin</p>
                        <p className="text-white">
                          {result.plan.ends_at
                            ? new Date(result.plan.ends_at).toLocaleDateString("fr-BE")
                            : "—"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}