import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchClusters,
  fetchDashboardMetrics,
  fetchReports,
  type DashboardMetrics,
  type IncidentPublic,
  type SpatialCluster,
} from "../lib/api";
import { formatDataAsOf } from "../lib/format";
import { ErrorNotice, Panel, Skeleton } from "../components/ui/Primitives";
import { useChartColors } from "../lib/theme";

export function AnalyticsPage() {
  const chart = useChartColors();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [clusters, setClusters] = useState<SpatialCluster[]>([]);
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [days, setDays] = useState("all");
  const [category, setCategory] = useState("all");
  const [ward, setWard] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchDashboardMetrics(),
      fetchClusters(),
      fetchReports(),
    ])
      .then(([m, c, reports]) => {
        if (cancelled) return;
        setMetrics(m);
        setClusters(c);
        setIncidents(reports);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load analytics. Try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const cutoff =
    days === "all" ? 0 : Date.now() - Number(days) * 24 * 60 * 60 * 1000;

  const filteredIncidents = useMemo(
    () =>
      incidents.filter((item) => {
        if (category !== "all" && item.category !== category) return false;
        if (ward !== "all" && item.ward_id !== ward) return false;
        if (cutoff && new Date(item.created_at).getTime() < cutoff) return false;
        return true;
      }),
    [incidents, category, ward, cutoff],
  );

  const filteredClusters = useMemo(
    () =>
      clusters.filter((cluster) => {
        if (category !== "all" && cluster.category !== category) return false;
        if (ward !== "all" && cluster.ward_id !== ward) return false;
        if (cutoff && new Date(cluster.latest_report).getTime() < cutoff) {
          return false;
        }
        return true;
      }),
    [clusters, category, ward, cutoff],
  );

  const emerging = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return filteredClusters.filter(
      (c) => new Date(c.latest_report).getTime() >= weekAgo,
    );
  }, [filteredClusters]);

  const trend = useMemo(() => {
    if (!metrics) return [];
    if (days === "all") return metrics.trend;
    return metrics.trend.slice(-Number(days));
  }, [metrics, days]);

  const categoryChart = useMemo(() => {
    if (!metrics) return [];
    if (category === "all") return metrics.by_category;
    return metrics.by_category.filter((row) => row.category === category);
  }, [metrics, category]);

  const wardChart = useMemo(() => {
    if (!metrics) return [];
    if (ward === "all") return metrics.by_ward;
    return metrics.by_ward.filter((row) => row.ward_id === ward);
  }, [metrics, ward]);

  const corridorChart = useMemo(() => {
    if (!metrics) return [];
    return metrics.by_corridor;
  }, [metrics]);

  const mix = useMemo(() => {
    const verified = filteredIncidents.filter((i) => i.is_verified).length;
    const pending = filteredIncidents.length - verified;
    return [
      { label: "Community-supported", count: verified },
      { label: "Pending", count: pending },
    ];
  }, [filteredIncidents]);

  if (error) {
    return (
      <div className="p-6">
        <ErrorNotice message={error} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 lg:p-7" aria-busy>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-80" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const ratio =
    filteredIncidents.length === 0
      ? 0
      : Math.round(
          (filteredIncidents.filter((i) => i.is_verified).length /
            filteredIncidents.length) *
            100,
        );

  function exportCsv() {
    const header = [
      "id",
      "category",
      "status",
      "corridor",
      "ward",
      "lat",
      "lng",
      "nearby_count",
      "cluster_id",
      "created_at",
    ];
    const lines = [
      header.join(","),
      ...filteredIncidents.map((row) =>
        [
          row.id,
          row.category_label,
          row.is_verified ? "community-supported" : "pending",
          row.corridor,
          row.ward_name,
          row.lat,
          row.lng,
          row.nearby_count,
          row.cluster_id ?? "",
          row.created_at,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "urbanmesh-kilimani-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="um-display">Analytics</h1>
          <p className="um-body mt-2 max-w-xl">
            How Kilimani reports concentrate, become community-supported, and emerge along pilot corridors.
          </p>
          <p className="um-meta mt-2">
            {formatDataAsOf(metrics.generated_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="min-h-10 rounded-card border border-civic-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-civic-mist"
        >
          Export data
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {metrics.by_category.map((row) => (
            <option key={row.category} value={row.category}>
              {row.label}
            </option>
          ))}
        </select>
        <select
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-sm"
        >
          <option value="all">All wards</option>
          {metrics.by_ward.map((row) => (
            <option key={row.ward_id} value={row.ward_id}>
              {row.ward_name}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-5 text-sm">
        Community-supported ratio: <strong>{ratio}%</strong> of filtered reports sit inside a
        15 m corroboration cluster.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Reports over time">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke={chart.line} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chart.muted }} />
                <YAxis allowDecimals={false} tick={{ fill: chart.muted }} />
                <Tooltip />
                <Line dataKey="total" name="Total" stroke={chart.ink} strokeWidth={2} dot={false} />
                <Line dataKey="verified" name="Community-supported" stroke={chart.accent} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Community-supported vs pending">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mix}>
                <CartesianGrid stroke={chart.line} />
                <XAxis dataKey="label" tick={{ fill: chart.muted }} />
                <YAxis allowDecimals={false} tick={{ fill: chart.muted }} />
                <Tooltip />
                <Bar dataKey="count" fill={chart.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Hazards by category">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart} layout="vertical">
                <CartesianGrid stroke={chart.line} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: chart.muted }} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: chart.muted }} />
                <Tooltip />
                <Bar dataKey="count" fill={chart.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Hazards by ward">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardChart}>
                <CartesianGrid stroke={chart.line} />
                <XAxis dataKey="ward_name" tick={{ fontSize: 10, fill: chart.muted }} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis allowDecimals={false} tick={{ fill: chart.muted }} />
                <Tooltip />
                <Bar dataKey="verified" name="Community-supported" stackId="a" fill={chart.accent} />
                <Bar dataKey="unverified" name="Pending" stackId="a" fill={chart.pending} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Hazard density by corridor"
          hint="Community-supported reports grouped by named Kilimani corridor"
        >
          <ul className="space-y-3">
            {corridorChart.map((row) => (
              <li key={row.corridor} className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.corridor}</span>
                <span className="text-civic-muted">
                  {row.verified} community-supported · {row.total} total
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Emerging clusters"
          hint="Community-supported clusters with a report in the last 7 days"
        >
          <ul className="mt-2 divide-y divide-civic-mist">
            {emerging.length === 0 ? (
              <li className="py-3 text-sm text-civic-muted">
                No newly active clusters this week.
              </li>
            ) : (
              emerging.map((c) => (
                <li key={c.cluster_id} className="flex justify-between py-3 text-sm">
                  <span className="font-medium">
                    {c.category_label} · {c.corridor}
                  </span>
                  <span className="text-civic-muted">{c.report_count} reports</span>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}