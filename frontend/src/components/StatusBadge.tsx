import React from "react";

type MemberStatus =
  | "active"
  | "inactif"
  | "actif"
  | "suspendu"
  | "expired"
  | "expiré"
  | "insurance_expired"
  | "no_active_subscription"
  | null
  | undefined;

const STATUS_MAP: Record<
  string,
  { label: string; bg: string; dot: string; text: string; title?: string }
> = {
  actif: {
    label: "Actif",
    bg: "bg-green-500/15",
    dot: "bg-green-500",
    text: "text-green-400",
    title: "Abonnement actif + assurance valide",
  },
  active: {
    label: "Actif",
    bg: "bg-green-500/15",
    dot: "bg-green-500",
    text: "text-green-400",
    title: "Abonnement actif + assurance valide",
  },
  expiré: {
    label: "Expiré",
    bg: "bg-orange-500/15",
    dot: "bg-orange-500",
    text: "text-orange-400",
    title: "Abonnement expiré",
  },
  expired: {
    label: "Expiré",
    bg: "bg-orange-500/15",
    dot: "bg-orange-500",
    text: "text-orange-400",
    title: "Abonnement expiré",
  },
  suspendu: {
    label: "Suspendu",
    bg: "bg-red-500/15",
    dot: "bg-red-500",
    text: "text-red-400",
    title: "Accès suspendu",
  },
  insurance_expired: {
    label: "Assurance expirée",
    bg: "bg-amber-500/15",
    dot: "bg-amber-500",
    text: "text-amber-400",
    title: "Assurance > 12 mois",
  },
  no_active_subscription: {
    label: "Sans abo",
    bg: "bg-slate-500/15",
    dot: "bg-slate-400",
    text: "text-slate-300",
    title: "Aucun abonnement actif",
  },
  inactif: {
    label: "Inactif",
    bg: "bg-slate-500/15",
    dot: "bg-slate-400",
    text: "text-slate-300",
    title: "Pas d’accès",
  },
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  const key = (status ?? "inactif").toString().toLowerCase();
  const cfg = STATUS_MAP[key] ?? STATUS_MAP["inactif"];

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
      title={cfg.title}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}