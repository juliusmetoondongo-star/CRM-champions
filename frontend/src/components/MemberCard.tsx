import { Eye, Mail, Phone, Calendar } from "lucide-react";

type MemberCardProps = {
  member: {
    id: string;
    member_code: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    last_seen_at: string | null;
    discipline_names: string[];
  };
  onClick: (id: string) => void;
};

export function MemberCard({ member, onClick }: MemberCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div
      onClick={() => onClick(member.id)}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer hover:border-white/20"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate mb-0.5">
            {member.first_name} {member.last_name}
          </h3>
          <p className="text-xs text-slate-400">#{member.member_code || "-"}</p>
        </div>
        <span
          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${
            member.status === "active"
              ? "bg-emerald-500/20 text-emerald-300"
              : member.status === "suspended"
              ? "bg-amber-500/20 text-amber-300"
              : "bg-slate-500/20 text-slate-300"
          }`}
        >
          {member.status === "active" ? "Actif" : member.status === "suspended" ? "Suspendu" : "Inactif"}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 mb-3">
        {member.email && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{member.phone}</span>
          </div>
        )}
        {member.last_seen_at && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Vu le {formatDate(member.last_seen_at)}</span>
          </div>
        )}
      </div>

      {/* Disciplines */}
      {member.discipline_names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {member.discipline_names.map((name, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md text-xs font-medium"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
