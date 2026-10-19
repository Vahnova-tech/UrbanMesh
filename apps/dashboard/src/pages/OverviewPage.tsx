import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  fetchMeta,
  fetchReports,
  type DashboardMetrics,
  type IncidentPublic,
  type PlatformMeta,
  type SpatialCluster,
} from "../lib/api";
import { formatDataAsOf, MONTH_LABEL } from "../lib/format";
import { ErrorNotice, Panel, PipelineStrip, Skeleton, StatCard, StatusBadge } from "../components/ui/Primitives";
import { DEFAULT_LAYERS, PlannerMap } from "../components/map/PlannerMap";
import { useChartColors } from "../lib/theme";

export function OverviewPage() {
  const chart = useChartColors();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [clusters, setClusters] = useState<SpatialCluster[]>([]);
  const [meta, setMeta] = useState<PlatformMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchDashboardMetrics(),
      fetchReports({ status: "all" }),
      fetchClusters(),
      fetchMeta(),
    ])
      .then(([m, reports, cls, platform]) => {
        if (cancelled) return;
        setMetrics(m);
        setIncidents(reports);
        setClusters(cls);
        setMeta(platform);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load the overview. Try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

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
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-8 w-80" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8">
      <header className="mb-8">
        <p className="um-eyebrow">Nairobi City County · {MONTH_LABEL}</p>
        <h1 className="um-display mt-2">
          Kilimani walkability intelligence
        </h1>
        <p className="um-body mt-3 max-w-2xl text-base">
          Residents report what they see. UrbanMesh groups nearby same-category
          reports into community-supported clusters. Planners receive that spatial
          corroboration as Kilimani planning input — not as a field inspection or a
          statutory LPDP.
        </p>
        <p className="um-meta mt-2">
          {formatDataAsOf(metrics.generated_at)}
        </p>
        <div className="mt-5">
          <PipelineStrip />
        </div>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Total reports" value={metrics.totals.all} />
        <StatCard label="Community-supported clusters" value={metrics.totals.clusters} />
        <StatCard label="Pending reports" value={metrics.totals.unverified} />
        <StatCard label="Affected areas" value={metrics.totals.affected_areas} />
      </div>
      <p className="um-meta mb-8">
        Affected areas use approximate Kilimani planning boxes, not official Nairobi ward polygons.
        Community-supported means spatial corroboration (≥3 same-category reports within 15 m), not a field inspection.
      </p>

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="h-[420px] overflow-hidden rounded-card border border-civic-line xl:col-span-3">
          <PlannerMap
            incidents={incidents}
            clusters={clusters}
            meta={meta}
            layers={DEFAULT_LAYERS}
          />
        </div>
        <div className="space-y-5 xl:col-span-2">
          <Panel title="Hazard-category distribution" hint="All citizen reports">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.by_category}
                  layout="vertical"
                  margin={{ left: 8, right: 12 }}
                >
                  <CartesianGrid stroke={chart.line} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: chart.muted }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={118}
                    tick={{ fontSize: 11, fill: chart.muted }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill={chart.accent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Daily reporting trend" hint="Total vs community-supported, Africa/Nairobi dates">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trend}>
                <CartesianGrid stroke={chart.line} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chart.muted }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chart.muted }} />
                <Tooltip />
                <Line dataKey="total" name="Total" stroke={chart.ink} strokeWidth={2} dot={false} />
                <Line dataKey="verified" name="Community-supported" stroke={chart.accent} strokeWidth={2} dot={false} />
                <Line dataKey="unverified" name="Pending" stroke={chart.pending} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Ward distribution" hint="Approximate bounding boxes, not official Nairobi ward polygons">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.by_ward} margin={{ bottom: 36 }}>
                <CartesianGrid stroke={chart.line} />
                <XAxis dataKey="ward_name" tick={{ fontSize: 10, fill: chart.muted }} interval={0} angle={-24} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fill: chart.muted }} />
                <Tooltip />
                <Bar dataKey="verified" name="Community-supported" stackId="a" fill={chart.accent} />
                <Bar dataKey="unverified" name="Pending" stackId="a" fill={chart.pending} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title="Recent community-supported clusters"
        hint="Same-category reports within 15 m, newest activity first. Not field-verified."
      >
        {clusters.length === 0 ? (
          <p className="text-sm text-civic-muted">No community-supported clusters yet.</p>
        ) : (
          <ul className="divide-y divide-civic-mist">
            {[...clusters]
              .sort((a, b) => b.latest_report.localeCompare(a.latest_report))
              .slice(0, 6)
              .map((cluster) => (
                <li key={cluster.cluster_id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold">{cluster.category_label}</p>
                    <p className="text-xs text-civic-muted">
                      {cluster.corridor} · {cluster.report_count} reports · {cluster.radius_meters}m
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge verified />
                    <Link
                      to={`/clusters?id=${cluster.cluster_id}`}
                      className="text-xs font-semibold text-civic-accent"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
