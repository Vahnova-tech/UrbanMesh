import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { HAZARD_OPTIONS } from "../lib/categories";
import { useLocationState } from "../lib/location";
import { useCollapsedReports } from "../lib/useCollapsedReports";
import { ErrorBanner, EvidenceEmpty, ReportCard } from "../components/ui/ReportCard";
import { BottomSheet } from "../components/ui/BottomSheet";
import { ButtonLink } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LiveMap, MapKey, type MapFocus } from "../components/map/LiveMap";
import { formatRelative, formatWhen } from "../lib/format";
import {
  geocodeKilimani,
  mergeSearchHits,
  searchIncidents,
  searchKilimaniPlaces,
  type SearchHit,
} from "../lib/places";

type StatusFilter = "all" | "verified" | "pending";
type MapView = "map" | "list";

export function MapHomePage() {
  const { coords, requestLocation, locating, error: locationError } = useLocationState();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectParam = searchParams.get("select");
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<MapView>("map");
  const [locateNonce, setLocateNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [remoteHits, setRemoteHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<IncidentPublic | null>(null);
  const [hideResolved, setHideResolved] = useState(true);

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

  useEffect(() => {
    if (!selectParam || incidents.length === 0) return;
    const match = incidents.find((row) => row.id === selectParam);
    if (!match) return;
    setCategory("all");
    setStatus("all");
    setFocus(null);
    setSelected(match);
    setView("map");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("select");
        return next;
      },
      { replace: true },
    );
  }, [selectParam, incidents, setSearchParams]);

  function selectReport(incident: IncidentPublic) {
    setFocus(null);
    setSelected(incident);
    setView("map");
  }

  const visible = useCollapsedReports(incidents, {
    hideResolved,
    category,
    status,
  });

  const verified = visible.filter((i) => i.is_verified).length;
  const pending = visible.length - verified;
  const mapIncidents = useMemo(() => {
    if (!selected) return visible;
    if (visible.some((row) => row.id === selected.id)) return visible;
    return [...visible, selected];
  }, [visible, selected]);
  const localHits = useMemo(
    () =>
      mergeSearchHits(searchKilimaniPlaces(query), searchIncidents(query, incidents)),
    [query, incidents],
  );

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setRemoteHits([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      void geocodeKilimani(needle, ctrl.signal)
        .then((hits) => {
          if (!ctrl.signal.aborted) setRemoteHits(hits);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setRemoteHits([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, 350);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const suggestions = useMemo(
    () => mergeSearchHits(localHits, remoteHits),
    [localHits, remoteHits],
  );

  function onLocate() {
    setFocus(null);
    requestLocation();
    setLocateNonce((n) => n + 1);
  }

  function onPickPlace(place: SearchHit) {
    setQuery(place.name);
    setFocus({ lat: place.lat, lng: place.lng, zoom: 17, label: place.name });
    setLocateNonce((n) => n + 1);
    setView("map");
    if (place.kind === "report" && place.reportId) {
      const match = incidents.find((row) => row.id === place.reportId);
      if (match) setSelected(match);
    }
  }

  const filtersActive = category !== "all" || status !== "all" || query.trim().length > 0;

  function clearFilters() {
    setCategory("all");
    setStatus("all");
    setQuery("");
    setFocus(null);
  }

  const filterProps = {
    query,
    onQuery: setQuery,
    suggestions,
    searching,
    onPickPlace,
    category,
    onCategory: setCategory,
    status,
    onStatus: setStatus,
    hideResolved,
    onHideResolved: setHideResolved,
    filtersActive,
    onClearFilters: clearFilters,
    onPickFromMap: () => {
      setView("map");
      setFiltersOpen(false);
    },
  };

  return (
    <div className="absolute inset-0 flex">
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className={view === "list" ? "absolute inset-0 hidden lg:block" : "absolute inset-0"}>
          <LiveMap
            incidents={mapIncidents}
            user={coords}
            locateNonce={locateNonce}
            focus={focus}
            showVerified={status !== "pending" || selected?.is_verified === true}
            showPending={status !== "verified" || selected?.is_verified === false}
            selectedId={selected?.id ?? null}
            onSelect={selectReport}
          />
        </div>

        {view === "list" ? (
          <div className="um-scroll absolute inset-0 bg-civic-paper px-3 pb-[max(10rem,calc(8.5rem+env(safe-area-inset-bottom)))] pt-[max(11rem,calc(9.5rem+env(safe-area-inset-top)))] lg:hidden">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-civic-ink">
                {loading && incidents.length === 0
                  ? "Loading…"
                  : `${visible.length} hazard${visible.length === 1 ? "" : "s"} · duplicates merged`}
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-civic-accent"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            {visible.length === 0 ? (
              <EvidenceEmpty onClear={clearFilters} filtersActive={filtersActive} />
            ) : (
              <div className="space-y-3">
                {visible.map((incident) => (
                  <ReportCard
                    key={incident.member_ids.join("|")}
                    incident={incident}
                    memberIds={incident.member_ids}
                    memberCount={incident.member_count}
                    onSelect={selectReport}
                    onCorroborated={() => setReload((n) => n + 1)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-[max(4.75rem,calc(3.85rem+env(safe-area-inset-top)))] z-[1100] px-3 lg:hidden">
          <div className="pointer-events-auto space-y-2">
            <div className="um-map-card rounded-card px-3.5 py-3.5 shadow-card">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-full border border-civic-line/80 bg-civic-mist/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-civic-slate">
                  Kilimani · Nairobi
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-civic-verified/25 bg-civic-verifiedBg px-2 py-0.5 text-[10px] font-semibold text-civic-verified">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-civic-verified" />
                  Live area
                </span>
              </div>
              <h1 className="mt-2.5 text-[1.15rem] font-semibold leading-snug tracking-tight text-civic-ink">
                Report a hazard. Build local evidence.
              </h1>
              <p className="mt-1 text-sm font-medium leading-snug text-civic-slate">
                Discover street hazards reported by your community.
              </p>
              <div className="mt-3.5 flex items-center gap-2">
                <ButtonLink to="/reports/new" className="min-h-10 shrink-0 rounded-full px-3.5 text-xs">
                  + Report a hazard
                </ButtonLink>
                <button
                  type="button"
                  onClick={() => {
                    setView("map");
                    setFiltersOpen(false);
                  }}
                  className="inline-flex min-h-10 items-center gap-1 rounded-full border border-civic-line bg-civic-surface/70 px-3 text-xs font-semibold text-civic-ink"
                >
                  <MapPinIcon className="h-3.5 w-3.5" />
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className="inline-flex min-h-10 items-center rounded-full border border-civic-line bg-civic-surface/70 px-3 text-xs font-semibold text-civic-ink"
                  aria-expanded={filtersOpen}
                >
                  {filtersOpen ? "Hide" : "Filters"}
                </button>
              </div>
              <Link to="/about" className="mt-2.5 inline-block text-xs font-semibold text-civic-accent">
                How it works
              </Link>
            </div>
            {filtersOpen ? (
              <div className="um-map-card rounded-card p-3.5 shadow-card">
                <MapFilters {...filterProps} />
              </div>
            ) : null}
          </div>
        </div>

        {error || locationError ? (
          <div className="absolute inset-x-3 top-[max(16rem,calc(14.5rem+env(safe-area-inset-top)))] z-[1100] space-y-2 lg:left-3 lg:right-auto lg:top-[max(5rem,calc(4rem+env(safe-area-inset-top)))] lg:w-[360px]">
            {error ? (
              <ErrorBanner message={error} onRetry={() => setReload((n) => n + 1)} />
            ) : null}
            {locationError ? <ErrorBanner message={locationError} /> : null}
          </div>
        ) : null}

        <div className={`absolute bottom-5 left-3 z-[1100] max-w-[calc(100%-8.5rem)] lg:hidden ${selected ? "hidden" : ""}`}>
          <SummaryCard
            loading={loading && incidents.length === 0}
            verified={verified}
            pending={pending}
          />
        </div>

        <div className="absolute bottom-[max(6.75rem,calc(5.5rem+env(safe-area-inset-bottom)))] right-3 z-[1100] flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
          <button
            type="button"
            onClick={() => setView((v) => (v === "map" ? "list" : "map"))}
            aria-pressed={view === "list"}
            className="min-h-11 rounded-full border border-civic-line bg-civic-surface/90 px-3.5 py-2 text-xs font-semibold text-civic-ink shadow-card backdrop-blur-md lg:hidden"
          >
            {view === "map" ? "List" : "Map"}
          </button>
          <button
            type="button"
            onClick={onLocate}
            className="min-h-11 rounded-full border border-civic-line bg-civic-surface/90 px-3.5 py-2 text-xs font-semibold text-civic-ink shadow-card backdrop-blur-md"
          >
            {locating ? "Locating…" : "Recenter on me"}
          </button>
        </div>

        <BottomSheet
          open={Boolean(selected) && view === "map"}
          title={selected?.category_label ?? "Report"}
          onClose={() => setSelected(null)}
        >
          {selected ? (
            <>
              <StatusBadge verified={selected.is_verified} size="sm" />
              <p className="um-body">{selected.description}</p>
              <p className="um-meta">
                {selected.corridor} · {formatRelative(selected.created_at)} · {formatWhen(selected.created_at)}
              </p>
              <p className="um-meta">
                {selected.is_verified
                  ? "Community-supported: three or more same-category reports within 15 m. Not a field inspection."
                  : "Pending: waiting for nearby same-category reports to corroborate this sighting."}
              </p>
              <ButtonLink to={`/reports/${selected.id}`} variant="ghost" className="min-h-11 px-0">
                Open full evidence
              </ButtonLink>
            </>
          ) : null}
        </BottomSheet>
      </div>

      <aside className="hidden w-[400px] shrink-0 flex-col border-l border-civic-line bg-civic-surface lg:flex">
        <div className="border-b border-civic-line px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-civic-line bg-civic-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-civic-slate">
              Kilimani · Nairobi
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-civic-verified/25 bg-civic-verifiedBg px-2 py-0.5 text-[10px] font-semibold text-civic-verified">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-civic-verified" />
              Live reporting area
            </span>
          </div>
          <h1 className="mt-3 text-[1.35rem] font-semibold leading-snug tracking-tight text-civic-ink">
            Report a hazard. Build local evidence.
          </h1>
          <p className="mt-1.5 text-sm leading-snug text-civic-slate">
            Discover street hazards reported by your community in Kilimani.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <ButtonLink to="/reports/new" className="min-h-11 flex-1 rounded-full text-sm">
              + Report a hazard
            </ButtonLink>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setFiltersOpen(false);
                setView("map");
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-civic-line px-3.5 text-sm font-semibold text-civic-ink transition-colors hover:bg-civic-mist"
            >
              <MapPinIcon />
              Map view
            </button>
          </div>
          <Link to="/about" className="mt-3 inline-block text-sm font-semibold text-civic-accent">
            How it works
          </Link>
        </div>
        <div className="border-b border-civic-line px-5 py-4">
          <MapFilters {...filterProps} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="um-eyebrow">Community evidence</p>
              <p className="mt-1 text-sm font-semibold text-civic-ink">
                {loading && incidents.length === 0
                  ? "Loading…"
                  : `${visible.length} hazard${visible.length === 1 ? "" : "s"} · duplicates merged`}
              </p>
              {!loading || incidents.length > 0 ? (
                <p className="um-meta mt-0.5">
                  {verified} community-supported · {pending} pending corroboration
                </p>
              ) : null}
            </div>
            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 text-xs font-semibold text-civic-accent"
              >
                Clear filters
              </button>
            ) : null}
          </div>
          {visible.length === 0 ? (
            <EvidenceEmpty onClear={clearFilters} filtersActive={filtersActive} />
          ) : (
            <div className="space-y-3">
              {visible.slice(0, 40).map((incident) => (
                <ReportCard
                  key={incident.member_ids.join("|")}
                  incident={incident}
                  memberIds={incident.member_ids}
                  memberCount={incident.member_count}
                  onSelect={selectReport}
                  onCorroborated={() => setReload((n) => n + 1)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

const HAZARD_CHIP: Record<string, string> = {
  MOBILITY_SURFACE_DAMAGE: "Road damage",
  NMT_PEDESTRIAN_HAZARD: "Obstruction",
  DRAINAGE_STORMWATER: "Drainage",
  SEWER_SANITATION: "Sanitation",
  LIGHTING_SECURITY: "Lighting",
  ILLEGAL_WASTE_DUMP: "Waste",
};

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
    <div className="um-map-card rounded-card px-3.5 py-3 shadow-card">
      {loading ? (
        <p className="um-meta">Loading Kilimani evidence…</p>
      ) : (
        <>
          <p className="text-sm font-semibold tracking-tight text-civic-ink">
            {verified} community-supported · {pending} pending
          </p>
          <div className="mt-2">
            <MapKey bare />
          </div>
        </>
      )}
    </div>
  );
}

function MapFilters({
  query,
  onQuery,
  suggestions,
  searching,
  onPickPlace,
  category,
  onCategory,
  status,
  onStatus,
  hideResolved,
  onHideResolved,
  filtersActive,
  onClearFilters,
  onPickFromMap,
}: {
  query: string;
  onQuery: (value: string) => void;
  suggestions: SearchHit[];
  searching: boolean;
  onPickPlace: (place: SearchHit) => void;
  category: string;
  onCategory: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
  hideResolved: boolean;
  onHideResolved: (value: boolean) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
  onPickFromMap: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const typed = query.trim().length >= 1;
  const showList = open && typed;

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!boxRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(hit: SearchHit) {
    onPickPlace(hit);
    setOpen(false);
  }

  function onKeyDown(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Escape") {
      setOpen(false);
      return;
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (suggestions[active]) pick(suggestions[active]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={boxRef}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={listId + "-q"} className="um-eyebrow">
            Find street evidence
          </label>
          <button
            type="button"
            onClick={onPickFromMap}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-civic-accent"
          >
            <MapPinIcon className="h-3.5 w-3.5" />
            Pick on map
          </button>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-civic-muted">
            <SearchIcon />
          </span>
          <input
            id={listId + "-q"}
            type="search"
            value={query}
            onChange={(e) => {
              onQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search streets or landmarks…"
            aria-label="Search Kilimani streets and landmarks"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full rounded-card border border-civic-line bg-civic-surface py-2.5 pl-9 pr-9 text-base outline-none focus:border-civic-accent lg:text-sm"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onQuery("");
                setOpen(false);
              }}
              className="absolute inset-y-0 right-2 flex items-center rounded-full px-1.5 text-civic-muted hover:text-civic-ink"
            >
              <ClearIcon />
            </button>
          ) : null}
        </div>
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-[1200] mt-1 max-h-64 overflow-y-auto rounded-card border border-civic-line bg-civic-surface shadow-card"
          >
            {suggestions.map((place, index) => (
              <li key={place.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(place)}
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm ${
                    index === active ? "bg-civic-mist" : ""
                  }`}
                >
                  <span className="font-semibold">{place.name}</span>
                  <span className="text-xs text-civic-muted">
                    {place.kind === "report"
                      ? "Hazard report · "
                      : place.hint === "Estate"
                        ? "Estate · "
                        : place.hint === "Landmark"
                          ? "Landmark · "
                          : "Street · "}
                    {place.hint}
                  </span>
                </button>
              </li>
            ))}
            {suggestions.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-civic-muted">
                {searching
                  ? "Looking up Kilimani streets…"
                  : "No match. Try Yaya, Argwings Kodhek, an estate, or a hazard type."}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="um-eyebrow">Hazard type</p>
          {filtersActive ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-[11px] font-semibold text-civic-accent"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 lg:flex-wrap">
          <FilterChip active={category === "all"} onClick={() => onCategory("all")}>
            All hazards
          </FilterChip>
          {HAZARD_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={category === opt.value}
              onClick={() => onCategory(opt.value)}
            >
              {HAZARD_CHIP[opt.value] ?? opt.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="um-eyebrow mb-1.5">Status</p>
        <div
          role="group"
          aria-label="Report status"
          className="inline-flex w-full rounded-full border border-civic-line bg-civic-mist/60 p-0.5"
        >
          {(
            [
              { id: "all", label: "All" },
              { id: "verified", label: "Supported" },
              { id: "pending", label: "Pending" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStatus(opt.id)}
              aria-pressed={status === opt.id}
              className={`min-h-8 flex-1 rounded-full px-2 text-[11px] font-semibold transition-colors ${
                status === opt.id
                  ? "bg-civic-surface text-civic-ink shadow-sm"
                  : "text-civic-muted hover:text-civic-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="um-meta mt-1.5">
          Supported means ≥3 same-category reports within 15 m — not a county inspection.
        </p>
        <label className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-civic-slate">
          <input
            type="checkbox"
            checked={hideResolved}
            onChange={(e) => onHideResolved(e.target.checked)}
            className="h-4 w-4 rounded border-civic-line text-civic-accent focus:ring-civic-accent"
          />
          Hide resolved on this device
        </label>
      </div>
    </div>
  );
}

function MapPinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-6.2 7-11.2A7 7 0 1 0 5 9.8C5 14.8 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.25" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m8 8 8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
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
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? "border-civic-ink bg-civic-ink text-civic-paper"
          : "border-civic-line bg-civic-surface text-civic-slate hover:bg-civic-mist"
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}