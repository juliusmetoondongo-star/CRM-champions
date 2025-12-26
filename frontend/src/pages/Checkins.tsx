import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Loading } from "../components/ui/Loading";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Clock } from "lucide-react";

interface Checkin {
  id: string;
  member_id: string;
  scanned_at: string;
  source: string;
  location: string;
  member?: {
    first_name: string;
    last_name: string;
    member_code: string;
  };
}

type TimePeriod = "today" | "week" | "month";

interface CheckinsProps {
  refreshKey?: number;
}

export function Checkins({ refreshKey = 0 }: CheckinsProps) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("today");

  useEffect(() => {
    loadCheckins();
  }, [period, refreshKey]);

  async function loadCheckins() {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
      }

      const { data, error } = await supabase
        .from("checkins")
        .select(`
          id,
          member_id,
          scanned_at,
          source,
          location,
          members:member_id (
            first_name,
            last_name,
            member_code
          )
        `)
        .gte("scanned_at", startDate.toISOString())
        .order("scanned_at", { ascending: false })
        .limit(10000);

      if (error) throw error;

      const formattedData = (data || []).map((checkin: any) => ({
        ...checkin,
        member: Array.isArray(checkin.members) ? checkin.members[0] : checkin.members,
      }));

      setCheckins(formattedData);
    } catch (error) {
      console.error("Error loading checkins:", error);
    } finally {
      setLoading(false);
    }
  }

  function getSourceBadge(source: string) {
    const variants: Record<string, "info" | "success" | "warning" | "neutral"> = {
      rfid: "info",
      manual: "warning",
      mobile: "success",
    };
    return <Badge variant={variants[source] || "neutral"}>{source.toUpperCase()}</Badge>;
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Check-ins</h1>
        <p className="text-muted">Historique des entrées à la salle</p>
      </div>

      <Card variant="glass">
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            variant={period === "today" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setPeriod("today")}
          >
            Aujourd'hui
          </Button>
          <Button
            variant={period === "week" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setPeriod("week")}
          >
            7 derniers jours
          </Button>
          <Button
            variant={period === "month" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setPeriod("month")}
          >
            30 derniers jours
          </Button>
        </div>

        {loading ? (
          <Loading />
        ) : checkins.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-12 h-12" />}
            title="Aucun check-in trouvé"
            description={`Aucune entrée enregistrée pour la période sélectionnée`}
          />
        ) : (
          <>
            <div className="mb-4 text-sm text-muted">
              {checkins.length} entrée{checkins.length > 1 ? "s" : ""} trouvée
              {checkins.length > 1 ? "s" : ""}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code membre</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Lieu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkins.map((checkin) => (
                  <TableRow
                    key={checkin.id}
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => checkin.member_id && window.history.pushState({}, '', `/members`)}
                    title="Cliquer pour voir tous les membres"
                  >
                    <TableCell className="font-mono text-xs text-primary-light">
                      {checkin.member?.member_code || "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {checkin.member
                        ? `${checkin.member.first_name} ${checkin.member.last_name}`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-muted">
                      {formatDateTime(checkin.scanned_at)}
                    </TableCell>
                    <TableCell>{getSourceBadge(checkin.source)}</TableCell>
                    <TableCell>{checkin.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Card>
    </div>
  );
}
