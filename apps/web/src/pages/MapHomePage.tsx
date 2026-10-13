import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { HAZARD_OPTIONS } from "../lib/categories";
import { useLocationState } from "../lib/location";
import { ErrorBanner, ReportCard } from "../components/ui/ReportCard";
import { LiveMap } from "../components/map/LiveMap";
import { searchKilimaniPlaces, type KilimaniPlace } from "../lib/places";

type StatusFilter = "all" | "verified" | "pending";
type MapView = "map" | "list";

export function MapHomePage() {
  const { coords, requestLocation, locating, error: locationError } = useLocationState();
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<MapView>("map");
  const [locateNonce, setLocateNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchReports({ status: "all", limit: 500 });
        if (!cancelled) {
          setIncidents(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load Kilimani reports. Try again.");
          setLoading(false);
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [reload]);

  const visible = useMemo(() => {
    return incidents.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (status === "verified" && !item.is_verified) return false;
      if (status === "pending" && item.is_verified) return false;
      return true;
    });
  }, [incidents, category, status]);

  const verified = visible.filter((i) => i.is_verified).length;
  const pending = visible.length - verified;
  const suggestions = searchKilimaniPlaces(query);

  function onLocate() {
    setFocus(null);
    requestLocation();
    setLocateNonce((n) => n + 1);
  }

  function onPickPlace(place: KilimaniPlace) {
    setQuery(place.name);
    setFocus({ lat: place.lat, lng: place.lng, zoom: 17 });
    setLocateNonce((n) => n + 1);
    setView("map");
  }

  const filters = (
    <MapFilters
      query={query}
      onQuery={setQuery}
      suggestions={suggestions}
      onPickPlace={onPickPlace}
      category={category}
      onCategory={setCategory}
      status={status}
      onStatus={setStatus}
    />
  );

  return (
    <div className="absolute inset-0 flex">
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className={view === "list" ? "absolute inset-0 hidden lg:block" : "absolute inset-0"}>
          <LiveMap
            incidents={visible}
            user={coords}
            locateNonce={locateNonce}
            focus={focus}
            showVerified={status !== "pending"}
            showPending={status !== "verified"}
          />
        </div>

        {view === "list" ? (
          <div className="um-scroll absolute inset-0 bg-civic-paper px-3 pb-[max(9rem,calc(7.5rem+env(safe-area-inset-bottom)))] pt-44 lg:hidden">
            {visible.length === 0 ? (
              <p className="text-sm font-medium text-civic-muted">
                No reports match these filters.
              </p>
            ) : (
              <div className="space-y-3">
                {visible.map((incident) => (
                  <ReportCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1100] px-3 lg:hidden">
          <div className="pointer-events-auto">{filters}</div>
        </div>

        {error || locationError ? (
          <div className="absolute inset-x-3 top-[9.5rem] z-[1100] space-y-2 lg:left-3 lg:right-auto lg:top-3 lg:w-[360px]">
            {error ? (
              <ErrorBanner message={error} onRetry={() => setReload((n) => n + 1)} />
            ) : null}
            {locationError ? <ErrorBanner message={locationError} /> : null}
          </div>
        ) : null}

        <div className="absolute bottom-5 left-3 z-[1100] max-w-[calc(100%-8.5rem)] lg:hidden">
          <SummaryCard
            loading={loading && incidents.length === 0}
            verified={verified}
            pending={pending}
          />
        </div>

        <div className="absolute bottom-5 right-3 z-[1100] flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
          <button
            type="button"
            onClick={() => setView((v) => (v === "map" ? "list" : "map"))}
            aria-pressed={view === "list"}
            className="min-h-11 rounded-card border border-civic-line bg-civic-surface px-3 py-2 text-xs font-semibold text-civic-ink shadow-card lg:hidden"
          >
            {view === "map" ? "List" : "Map"}
          </button>
          <button
            type="button"
            onClick={onLocate}
            className="min-h-11 rounded-card border border-civic-line bg-civic-surface px-3 py-2 text-xs font-semibold text-civic-ink shadow-card"
          >
            {locating ? "Locating…" : "Recenter on me"}
          </button>
          <Link
            to="/report"
            className="inline-flex min-h-14 items-center rounded-card bg-civic-accent px-5 text-sm font-semibold text-white shadow-card lg:hidden"
          >
            Report a hazard
          </Link>
        </div>
      </div>

      <aside className="hidden w-[380px] shrink-0 flex-col border-l border-civic-line bg-civic-surface lg:flex">
        <div className="border-b border-civic-line p-4">{filters}</div>
        <div className="border-b border-civic-line px-4 py-3">
          <SummaryCard
            loading={loading && incidents.length === 0}
            verified={verified}
            pending={pending}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-civic-muted">
            Visible evidence
          </p>
          {visible.length === 0 ? (
            <p className="text-sm text-civic-muted">No reports match these filters.</p>
          ) : (
            <div className="space-y-3">
              {visible.slice(0, 40).map((incident) => (
                <ReportCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-civic-line p-4">
          <Link
            to="/report"
            className="flex min-h-12 items-center justify-center rounded-card bg-civic-accent text-sm font-semibold text-white"
          >
            Report a hazard
          </Link>
        </div>
      </aside>
    </div>
  );
}

function SummaryCard({
  loading,
  verified,
  pending,
}: {
  loading: boolean;
  verified: number;
  pending: number;
}) {
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-3 py-2.5 shadow-card lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      {loading ? (
        <p className="text-sm font-medium text-civic-muted">Loading Kilimani evidence…</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-civic-ink">
            {verified} verified hazards
          </p>
          <p className="text-xs font-medium text-civic-muted">
            {pending} pending reports
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-civic-muted">
            Solid pins are verified 15 m clusters. Dashed pins are individual reports still waiting for nearby confirmation.
          </p>
        </>
      )}
    </div>
  );
}

function MapFilters({
  query,
  onQuery,
  suggestions,
  onPickPlace,
  category,
  onCategory,
  status,
  onStatus,
}: {
  query: string;
  onQuery: (value: string) => void;
  suggestions: KilimaniPlace[];
  onPickPlace: (place: KilimaniPlace) => void;
  category: string;
  onCategory: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search Kilimani streets"
          aria-label="Search Kilimani streets"
          className="w-full rounded-card border border-civic-line bg-civic-surface px-3 py-2.5 text-base shadow-card outline-none focus:border-civic-accent lg:text-sm lg:shadow-none"
        />
        {suggestions.length > 0 ? (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-card border border-civic-line bg-civic-surface shadow-card">
            {suggestions.map((place) => (
              <li key={place.name}>
                <button
                  type="button"
                  onClick={() => onPickPlace(place)}
                  className="flex w-full flex-col px-3 py-2 text-left text-sm"
                >
                  <span className="font-semibold">{place.name}</span>
                  <span className="text-xs text-civic-muted">{place.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
        <FilterChip active={category === "all"} onClick={() => onCategory("all")}>
          All
        </FilterChip>
        {HAZARD_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={category === opt.value}
            onClick={() => onCategory(opt.value)}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
        <FilterChip active={status === "all"} onClick={() => onStatus("all")}>
          All statuses
        </FilterChip>
        <FilterChip
          active={status === "verified"}
          onClick={() => onStatus("verified")}
        >
          Verified clusters
        </FilterChip>
        <FilterChip
          active={status === "pending"}
          onClick={() => onStatus("pending")}
        >
          Pending reports
        </FilterChip>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-card lg:shadow-none ${
        active
          ? "border-civic-ink bg-civic-ink text-civic-paper"
          : "border-civic-line bg-civic-surface text-civic-slate"
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}