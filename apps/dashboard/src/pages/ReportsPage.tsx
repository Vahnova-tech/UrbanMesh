import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { formatWhen } from "../lib/format";
import { ErrorNotice, EvidencePhoto, StatusBadge } from "../components/ui/Primitives";

export function ReportsPage() {
  const [params] = useSearchParams();
  const clusterFilter = params.get("cluster");
  const [items, setItems] = useState<IncidentPublic[]>([]);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchReports()
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load reports. Try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category_label))],
    [items],
  );

  const filtered = items.filter((item) => {
    if (clusterFilter && item.cluster_id !== clusterFilter) return false;
    if (category !== "all" && item.category_label !== category) return false;
    if (status === "verified" && !item.is_verified) return false;
    if (status === "pending" && item.is_verified) return false;
    if (days !== "all") {
      const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
      if (new Date(item.created_at).getTime() < cutoff) return false;
    }
    return true;
  });

  return (
    <div className="p-5 lg:p-8">
      <h1 className="um-display">Reports</h1>
      {clusterFilter ? (
        <p className="um-meta mt-2">One cluster.</p>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} onRetry={() => setReload((n) => n + 1)} />
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="um-eyebrow">Hazard type</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-10 rounded-sm border border-civic-line bg-civic-surface px-3 py-2 text-sm"
          >
            <option value="all">All hazards</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="um-eyebrow">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-h-10 rounded-sm border border-civic-line bg-civic-surface px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="verified">Community-supported</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="um-eyebrow">Date</span>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="min-h-10 rounded-sm border border-civic-line bg-civic-surface px-3 py-2 text-sm"
          >
            <option value="all">Any date</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-civic-line bg-civic-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-civic-line bg-civic-paper/60">
            <tr>
              <th className="um-eyebrow px-4 py-3.5 font-semibold">Photo</th>
              <th className="um-eyebrow px-4 py-3.5 font-semibold">Hazard</th>
              <th className="um-eyebrow px-4 py-3.5 font-semibold">Corridor</th>
              <th className="um-eyebrow px-4 py-3.5 font-semibold">Area</th>
              <th className="um-eyebrow px-4 py-3.5 font-semibold">Status</th>
              <th className="um-eyebrow px-4 py-3.5 font-semibold">Nearby</th>
              <th className="um-eyebrow px-4 py-3.5 font-semibold">Reported</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="um-title text-base lg:text-base">No reports match these filters</p>
                  <p className="um-meta mt-1">Widen the hazard type, status, or date filters.</p>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-civic-mist transition-colors hover:bg-civic-mist/50"
                >
                  <td className="px-4 py-3.5">
                    <EvidencePhoto
                      url={row.photo_url}
                      alt={`${row.category_label} evidence`}
                    />
                    {!row.photo_url ? (
                      <span className="text-xs text-civic-muted">—</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold tracking-tight text-civic-ink">{row.category_label}</p>
                    <p className="um-meta mt-0.5 line-clamp-2">{row.description}</p>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{row.corridor}</td>
                  <td className="px-4 py-3.5 text-civic-slate">{row.ward_name}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge verified={row.is_verified} />
                  </td>
                  <td className="px-4 py-3.5 tabular-nums">{row.nearby_count}</td>
                  <td className="px-4 py-3.5 um-meta">{formatWhen(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}