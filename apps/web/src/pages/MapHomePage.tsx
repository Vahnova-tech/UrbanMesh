import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { HAZARD_OPTIONS } from "../lib/categories";
import { useLocationState } from "../lib/location";
import { ErrorBanner, ReportCard } from "../components/ui/ReportCard";
import { BottomSheet } from "../components/ui/BottomSheet";
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
  };

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
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        {view === "list" ? (
          <div className="um-scroll absolute inset-0 bg-civic-paper px-3 pb-[max(9rem,calc(7.5rem+env(safe-area-inset-bottom)))] pt-36 lg:hidden">
            {visible.length === 0 ? (
              <p className="text-sm font-medium text-civic-muted">
                No Kilimani reports match these filters.
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
          <div className="pointer-events-auto space-y-2">
            <div className="rounded-card border border-civic-line bg-civic-surface px-3 py-2.5 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
                Kilimani pilot · Nairobi
              </p>
              <h1 className="mt-0.5 text-sm font-semibold tracking-tight text-civic-ink">
                Report street hazards. UrbanMesh groups nearby reports into planning evidence.
              </h1>
              <div className="mt-2 flex gap-2">
                <Link
                  to="/about"
                  className="text-xs font-semibold text-civic-accent"
                >
                  How reporting works
                </Link>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className="ml-auto text-xs font-semibold text-civic-slate"
                  aria-expanded={filtersOpen}
                >
                  {filtersOpen ? "Hide filters" : "Filters"}
                </button>
              </div>
            </div>
            {filtersOpen ? (
              <div className="rounded-card border border-civic-line bg-civic-surface p-3 shadow-card">
                <MapFilters {...filterProps} />
              </div>
            ) : null}
          </div>
        </div>

        {error || locationError ? (
          <div className="absolute inset-x-3 top-[9.5rem] z-[1100] space-y-2 lg:left-3 lg:right-auto lg:top-3 lg:w-[360px]">
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
            Report an issue
          </Link>
        </div>

        <BottomSheet
          open={Boolean(selected) && view === "map"}
          title={selected?.category_label ?? "Report"}
          onClose={() => setSelected(null)}
        >
          {selected ? (
            <div className="space-y-2 pb-2">
              <StatusBadge verified={selected.is_verified} size="sm" />
              <p className="text-sm leading-relaxed text-civic-slate">{selected.description}</p>
              <p className="text-xs font-medium text-civic-muted">
                {selected.corridor} · {formatRelative(selected.created_at)} · {formatWhen(selected.created_at)}
              </p>
              <p className="text-xs leading-relaxed text-civic-muted">
                {selected.is_verified
                  ? "Community-supported: three or more same-category reports within 15 m. Not a field inspection."
                  : "Pending: waiting for nearby same-category reports to corroborate this sighting."}
              </p>
              <Link
                to={`/hazards/${selected.id}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-civic-accent"
              >
                Open full evidence
              </Link>
            </div>
          ) : null}
        </BottomSheet>
      </div>

      <aside className="hidden w-[380px] shrink-0 flex-col border-l border-civic-line bg-civic-surface lg:flex">
        <div className="border-b border-civic-line p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
            Kilimani pilot · Nairobi City County
          </p>
          <h1 className="mt-1 text-base font-semibold tracking-tight">
            Street hazards become planning evidence when neighbours corroborate them.
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-civic-muted">
            Scope is Kilimani only. Community-supported clusters are spatial corroboration, not county inspection.
          </p>
          <Link to="/about" className="mt-2 inline-block text-xs font-semibold text-civic-accent">
            How reporting works
          </Link>
        </div>
        <div className="border-b border-civic-line p-4">
          <MapFilters {...filterProps} />
        </div>
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
            <p className="text-sm text-civic-muted">No Kilimani reports match these filters.</p>
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
            Report an issue
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
            {verified} community-supported
          </p>
          <p className="text-xs font-medium text-civic-muted">
            {pending} pending reports
          </p>
          <div className="mt-2 lg:hidden">
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
    <div className="space-y-2">
      <div className="relative" ref={boxRef}>
        <label htmlFor={listId + "-q"} className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
          Search streets
        </label>
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
          placeholder="Yaya, Argwings Kodhek, Ngong Road…"
          aria-label="Search Kilimani streets"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-card border border-civic-line bg-civic-surface px-3 py-2.5 text-base shadow-card outline-none focus:border-civic-accent lg:text-sm lg:shadow-none"
        />
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
                    {place.kind === "report" ? "Hazard report · " : "Street or landmark · "}
                    {place.hint}
                  </span>
                </button>
              </li>
            ))}
            {suggestions.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-civic-muted">
                {searching
                  ? "Looking up Kilimani streets…"
                  : "No match. Try Argwings Kodhek, Yaya, Ngong Road, or a report category."}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
        Hazard type
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
        <FilterChip active={category === "all"} onClick={() => onCategory("all")}>
          All hazards
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
      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
        Status
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
        <FilterChip active={status === "all"} onClick={() => onStatus("all")}>
          All statuses
        </FilterChip>
        <FilterChip
          active={status === "verified"}
          onClick={() => onStatus("verified")}
        >
          Community-supported
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