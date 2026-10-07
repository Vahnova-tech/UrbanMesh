import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { formatWhen } from "../lib/format";
import { EvidencePhoto, StatusBadge } from "../components/ui/Primitives";

export function ReportsPage() {
  const [params] = useSearchParams();
  const clusterFilter = params.get("cluster");
  const [items, setItems] = useState<IncidentPublic[]>([]);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState("all");

  useEffect(() => {
    void fetchReports().then(setItems);
  }, []);

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
    <div className="p-5 lg:p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-1 text-sm text-civic-muted">
        Every geotagged citizen report in the Kilimani catchments.
        {clusterFilter ? " Showing one verified cluster’s evidence." : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-sm"
        >
          <option value="all">Any date</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-civic-line bg-civic-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-civic-line text-xs uppercase tracking-wide text-civic-muted">
            <tr>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Hazard</th>
              <th className="px-4 py-3">Corridor</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Nearby</th>
              <th className="px-4 py-3">Reported</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-civic-muted">
                  No reports match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-civic-mist">
                  <td className="px-4 py-3">
                    <EvidencePhoto
                      url={row.photo_url}
                      alt={`${row.category_label} evidence`}
                    />
                    {!row.photo_url ? (
                      <span className="text-xs text-civic-muted">—</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.category_label}</p>
                    <p className="text-xs text-civic-muted">{row.description}</p>
                  </td>
                  <td className="px-4 py-3">{row.corridor}</td>
                  <td className="px-4 py-3">{row.ward_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge verified={row.is_verified} />
                  </td>
                  <td className="px-4 py-3">{row.nearby_count}</td>
                  <td className="px-4 py-3 text-civic-muted">{formatWhen(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}