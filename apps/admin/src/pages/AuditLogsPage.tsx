import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGlobalAudit, type AdminAuditEntry } from "../lib/api";
import { formatWhen } from "../lib/format";
import { actionLabel } from "../lib/status";

export function AuditLogsPage({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGlobalAudit(200);
      setRows(data.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load audit log.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-civic-ink">Audit</h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-10 rounded-full border border-civic-line px-3.5 text-xs font-semibold hover:bg-civic-mist"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm text-civic-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-8 text-sm text-civic-muted">No audit entries yet.</p>
        ) : (
          <ol className="mt-6 space-y-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-card border border-civic-line bg-civic-surface px-4 py-3"
              >
                <p className="text-sm font-semibold text-civic-ink">
                  {actionLabel(row.action)}
                </p>
                <p className="mt-1 text-xs text-civic-muted">
                  {row.actor} · {formatWhen(row.created_at)} EAT
                  {row.incident_id ? (
                    <>
                      {" · "}
                      <Link
                        to={`/reports/${row.incident_id}`}
                        className="font-semibold text-civic-accent hover:underline"
                      >
                        {row.incident_id.slice(0, 8).toUpperCase()}
                      </Link>
                    </>
                  ) : null}
                </p>
                {row.reason ? (
                  <p className="mt-2 text-sm text-civic-slate">{row.reason}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
