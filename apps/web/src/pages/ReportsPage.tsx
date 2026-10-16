import { useEffect, useMemo, useState } from "react";
import {
  fetchNearbyReports,
  fetchReports,
  type IncidentPublic,
} from "../lib/api";
import { HAZARD_OPTIONS } from "../lib/categories";
import { haversineMeters } from "../lib/geo";
import { useLocationState } from "../lib/location";
import { EmptyState, ErrorBanner, ReportCard } from "../components/ui/ReportCard";
import { Link } from "react-router-dom";
import { PipelineStrip, SkeletonList } from "../components/ui/Pipeline";

type Tab = "nearby" | "recent" | "verified";

const DISTANCES = [
  { value: 200, label: "200 m" },
  { value: 400, label: "400 m" },
  { value: 900, label: "900 m" },
  { value: 1500, label: "1.5 km" },
];

const DATES = [
  { value: "all", label: "Any date", days: 0 },
  { value: "1", label: "Last 24 hours", days: 1 },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
];

export function ReportsPage() {
  const { coords, requestLocation } = useLocationState();
  const [tab, setTab] = useState<Tab>("nearby");
  const [items, setItems] = useState<IncidentPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [distance, setDistance] = useState(900);
  const [date, setDate] = useState("all");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let data: IncidentPublic[] = [];
        if (tab === "nearby") {
          if (!coords) {
            data = [];
          } else {
            data = await fetchNearbyReports(coords.lat, coords.lng, distance);
          }
        } else if (tab === "verified") {
          data = await fetchReports({ status: "verified", limit: 200 });
        } else {
          data = await fetchReports({ status: "all", limit: 200 });
        }
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load Kilimani reports. Try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, coords, distance, reload]);

  const filtered = useMemo(() => {
    const cutoff =
      date === "all"
        ? 0
        : Date.now() - Number(date) * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (status === "verified" && !item.is_verified) return false;
      if (status === "pending" && item.is_verified) return false;
      if (cutoff && new Date(item.created_at).getTime() < cutoff) return false;
      if (tab !== "nearby" && coords && distance) {
        const dist = haversineMeters(coords.lat, coords.lng, item.lat, item.lng);
        if (dist > distance) return false;
      }
      return true;
    });
  }, [items, category, status, date, tab, coords, distance]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">Reports</h1>
          <p className="mt-1 text-sm text-civic-muted">
            Nearby evidence across Kilimani.
          </p>
          <div className="mt-2">
            <PipelineStrip compact />
          </div>
        </div>
        <Link
          to="/report"
          className="rounded-card bg-civic-accent px-3 py-2 text-xs font-semibold text-white lg:min-h-11 lg:px-4 lg:text-sm"
        >
          + Report
        </Link>
      </div>

      <div className="mb-3 flex rounded-card border border-civic-line bg-civic-mist p-1">
        {(
          [
            ["nearby", "Near me"],
            ["recent", "Recent"],
            ["verified", "Verified"],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-[10px] py-2 text-xs font-semibold ${
              tab === id ? "bg-civic-surface text-civic-ink shadow-card" : "text-civic-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
        <label className="flex shrink-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
            Hazard type
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-base font-semibold lg:text-xs"
          >
            <option value="all">All hazards</option>
            {HAZARD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex shrink-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-base font-semibold lg:text-xs"
          >
            <option value="all">All statuses</option>
            <option value="verified">Verified clusters</option>
            <option value="pending">Pending confirmation</option>
          </select>
        </label>
        <label className="flex shrink-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
            Distance
          </span>
          <select
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-base font-semibold lg:text-xs"
          >
            {DISTANCES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex shrink-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
            Date
          </span>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-civic-line bg-civic-surface px-3 py-2 text-base font-semibold lg:text-xs"
          >
            {DATES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tab === "nearby" && !coords ? (
        <EmptyState
          title="Turn on location"
          body="UrbanMesh uses your position to show hazards within walking distance of you."
        />
      ) : null}

      {tab === "nearby" && !coords ? (
        <button
          type="button"
          onClick={requestLocation}
          className="mt-3 w-full rounded-card border border-civic-line bg-civic-surface py-3 text-sm font-semibold lg:w-auto lg:px-5"
        >
          Use my location
        </button>
      ) : null}

      {error ? (
        <ErrorBanner message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : null}
      {loading ? <SkeletonList rows={4} /> : null}

      {!loading && filtered.length === 0 && (tab !== "nearby" || coords) ? (
        <EmptyState
          title="No reports in this view"
          body="Try another tab, distance or date — or log the first report on this stretch."
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((incident) => (
          <ReportCard key={incident.id} incident={incident} />
        ))}
      </div>
    </div>
  );
}