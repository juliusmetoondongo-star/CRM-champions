import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Loading } from "../components/ui/Loading";
import { EmptyState } from "../components/ui/EmptyState";
import { FileText } from "lucide-react";

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, any>;
  created_at: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, actor, action, entity, entity_id, meta, created_at")
        .order("created_at", { ascending: false })
        .range(0, 99);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatMeta(meta: Record<string, any>) {
    if (!meta || Object.keys(meta).length === 0) return "-";
    return JSON.stringify(meta, null, 2);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Journaux d'audit</h1>
        <p className="text-muted">Historique des actions effectuées dans le système</p>
      </div>

      <Card variant="glass">
        {loading ? (
          <Loading />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Aucun journal trouvé"
            description="Les actions du système apparaîtront ici"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Acteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Métadonnées</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted font-mono text-xs">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{log.actor}</TableCell>
                  <TableCell className="capitalize">{log.action}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{log.entity}</span>
                      {log.entity_id && (
                        <span className="text-xs text-muted font-mono truncate max-w-[200px]">
                          {log.entity_id}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <details className="cursor-pointer">
                      <summary className="text-primary hover:text-primary-light text-sm transition-colors">
                        Voir
                      </summary>
                      <pre className="mt-2 text-xs bg-surface p-3 rounded-lg overflow-auto max-w-[300px] border border-white/5">
                        {formatMeta(log.meta)}
                      </pre>
                    </details>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
