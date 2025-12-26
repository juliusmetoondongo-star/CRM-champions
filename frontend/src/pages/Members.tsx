import { useEffect, useState, useMemo } from "react";
import { Search, Download, Eye, Filter, Plus } from "lucide-react";
import * as Q from "../lib/supabaseQueries";
import { MemberDetailsModal } from "../features/members/MemberDetailsModal";
import { MemberCreateModal } from "../features/members/MemberCreateModal";
import { MemberCard } from "../components/MemberCard";
import { exportCSV } from "../utils/exportCsv";

type MemberRow = {
  id: string;
  member_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  last_seen_at: string | null;
  discipline_slugs: string[];
  discipline_names: string[];
  created_at: string;
  updated_at: string;
};

export default function Members() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState<Array<{ id: string; slug: string; name: string }>>([]);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Tri
  const [sortBy, setSortBy] = useState<keyof MemberRow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();

  // Charger les disciplines
  useEffect(() => {
    (async () => {
      try {
        const data = await Q.getDisciplines();
        setDisciplines(data);
      } catch (error) {
        console.error("Erreur chargement disciplines:", error);
      }
    })();
  }, []);

  // Charger les membres
  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await Q.getMembersDirectory({
        discipline: selectedDiscipline === "all" ? undefined : selectedDiscipline,
        search: searchQuery.trim() || undefined,
        limit: 10000, // Augmenté pour supporter jusqu'à 10000 membres
        offset: 0,
      });
      console.log(`Page Members: Chargé ${data.length} membres`);
      setMembers(data);
    } catch (error) {
      console.error("Erreur chargement membres:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [selectedDiscipline]);

  // Écouter les événements de refresh globaux
  useEffect(() => {
    const handleRefresh = () => loadMembers();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [selectedDiscipline, searchQuery]);

  // Filtrage local
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Filtre par statut
    if (selectedStatus !== "all") {
      result = result.filter((m) => m.status === selectedStatus);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((m) => {
        const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
        const email = (m.email || "").toLowerCase();
        const code = (m.member_code || "").toLowerCase();
        const disciplines = m.discipline_names.join(" ").toLowerCase();
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          code.includes(query) ||
          disciplines.includes(query)
        );
      });
    }

    // Tri
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDir === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [members, selectedStatus, searchQuery, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDiscipline, selectedStatus]);

  // Fonction de tri
  const handleSort = (column: keyof MemberRow) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Code", "Prénom", "Nom", "Email", "Téléphone", "Statut", "Disciplines", "Dernière visite"];
    const rows = filteredMembers.map((m) => [
      m.member_code || "",
      m.first_name || "",
      m.last_name || "",
      m.email || "",
      m.phone || "",
      m.status,
      m.discipline_names.join(", "),
      m.last_seen_at ? new Date(m.last_seen_at).toLocaleDateString("fr-FR") : "",
    ]);

    exportCSV(headers, rows, `membres_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Ouvrir détails
  const handleViewDetails = (memberId: string) => {
    setSelectedMemberId(memberId);
    setShowDetailsModal(true);
  };

  // Formater la date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Membres</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          {filteredMembers.length} membre{filteredMembers.length > 1 ? "s" : ""}
          {filteredMembers.length !== members.length && <span className="hidden sm:inline"> sur {members.length} au total</span>}
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
        <div className="space-y-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-white/10 text-white rounded-lg border border-white/10 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Filtres */}
          <div className="flex gap-2">
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm bg-white/10 text-white rounded-lg border border-white/10 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Disciplines</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm bg-white/10 text-white rounded-lg border border-white/10 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="suspended">Suspendu</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <Th onClick={() => handleSort("member_code")}>Code</Th>
                <Th onClick={() => handleSort("first_name")}>Prénom</Th>
                <Th onClick={() => handleSort("last_name")}>Nom</Th>
                <Th onClick={() => handleSort("email")}>Email</Th>
                <Th>Disciplines</Th>
                <Th onClick={() => handleSort("status")}>Statut</Th>
                <Th onClick={() => handleSort("last_seen_at")}>Dernière visite</Th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Chargement...
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucun membre trouvé
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-slate-300">{member.member_code || "-"}</td>
                    <td className="py-3 px-4 text-white font-medium">{member.first_name || "-"}</td>
                    <td className="py-3 px-4 text-white font-medium">{member.last_name || "-"}</td>
                    <td className="py-3 px-4 text-slate-300">{member.email || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {member.discipline_names.length > 0 ? (
                          member.discipline_names.map((name, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          member.status === "active"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : member.status === "suspended"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{formatDate(member.last_seen_at)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewDetails(member.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">Voir</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-t border-white/10">
            <div className="text-sm text-slate-400">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            Chargement...
          </div>
        ) : paginatedMembers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Aucun membre trouvé
          </div>
        ) : (
          paginatedMembers.map((member) => (
            <MemberCard key={member.id} member={member} onClick={handleViewDetails} />
          ))
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="lg:hidden flex items-center justify-between py-4">
          <div className="text-xs text-slate-400">
            {currentPage}/{totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Préc
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Suiv
            </button>
          </div>
        </div>
      )}

      {/* Modales */}
      {showCreateModal && (
        <MemberCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadMembers();
          }}
        />
      )}

      {showDetailsModal && selectedMemberId && (
        <MemberDetailsModal
          memberId={selectedMemberId}
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMemberId(undefined);
          }}
          onChanged={() => {
            loadMembers();
          }}
        />
      )}
    </div>
  );
}

// Composant header de colonne avec tri
function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      className={`py-3 px-4 text-left text-sm font-medium text-slate-300 ${
        onClick ? "cursor-pointer hover:text-white transition-colors select-none" : ""
      }`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && <Filter className="w-3 h-3 opacity-60" />}
      </span>
    </th>
  );
}
