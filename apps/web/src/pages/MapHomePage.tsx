import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { HAZARD_OPTIONS } from "../lib/categories";
import { useLocationState } from "../lib/location";
import { EmptyState, ErrorBanner, ReportCard } from "../components/ui/ReportCard";
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
            {visible.length === 0 ? (
              <EmptyState
                title="No Kilimani reports match these filters"
                body="Widen the hazard type or status filters, or report what you see on the street."
              />
            ) : (
              <div className="space-y-3">
                {visible.map((incident) => (
                  <ReportCard key={incident.id} incident={incident} onSelect={selectReport} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-[max(4.75rem,calc(3.85rem+env(safe-area-inset-top)))] z-[1100] px-3 lg:hidden">
          <div className="pointer-events-auto space-y-2">
            <div className="rounded-card border border-civic-line bg-civic-surface px-3.5 py-3.5 shadow-card">
              <p className="um-eyebrow">Kilimani pilot · Nairobi</p>
              <h1 className="mt-1.5 text-[1.05rem] font-semibold leading-snug tracking-tight text-civic-ink">
                Street hazards, reported by neighbours. Corroborated into planning evidence.
              </h1>
              <p className="um-meta mt-1.5">
                The live map is the product. Report what you see, or explore existing Kilimani evidence.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ButtonLink to="/report" className="min-h-10 px-3.5 text-xs">
                  Report an issue
                </ButtonLink>
                <button
                  type="button"
                  onClick={() => {
                    setView("map");
                    setFiltersOpen(false);
                  }}
                  className="inline-flex min-h-10 items-center rounded-card border border-civic-line bg-civic-surface px-3.5 text-xs font-semibold text-civic-ink"
                >
                  Explore the map
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className="ml-auto rounded-sm border border-civic-line px-2.5 py-1.5 text-xs font-semibold text-civic-slate"
                  aria-expanded={filtersOpen}
                >
                  {filtersOpen ? "Hide filters" : "Filters"}
                </button>
              </div>
              <Link to="/about" className="mt-2.5 inline-block text-xs font-semibold text-civic-accent">
                How reporting works
              </Link>
            </div>
            {filtersOpen ? (
              <div className="rounded-card border border-civic-line bg-civic-surface p-3.5 shadow-card">
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
              <ButtonLink to={`/hazards/${selected.id}`} variant="ghost" className="min-h-11 px-0">
                Open full evidence
              </ButtonLink>
            </>
          ) : null}
        </BottomSheet>
      </div>

      <aside className="hidden w-[400px] shrink-0 flex-col border-l border-civic-line bg-civic-surface lg:flex">
        <div className="border-b border-civic-line px-5 py-6">
          <p className="um-eyebrow">Kilimani pilot · Nairobi City County</p>
          <h1 className="um-display mt-2 text-2xl lg:text-[1.75rem]">
            Report street hazards. Neighbours turn them into evidence.
          </h1>
          <p className="um-body mt-3">
            Scope is Kilimani only. Community-supported clusters are spatial corroboration
            (≥3 same-category reports within 15 m), not county inspection.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <ButtonLink to="/report" className="w-full min-h-12">
              Report an issue
            </ButtonLink>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setFiltersOpen(false);
                setView("map");
              }}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-card border border-civic-line text-sm font-semibold text-civic-ink transition-colors hover:bg-civic-mist"
            >
              Explore the map
            </button>
          </div>
          <Link to="/about" className="mt-3 inline-block text-sm font-semibold text-civic-accent">
            How reporting works
          </Link>
        </div>
        <div className="border-b border-civic-line px-5 py-4">
          <MapFilters {...filterProps} />
        </div>
        <div className="border-b border-civic-line px-5 py-4">
          <SummaryCard
            loading={loading && incidents.length === 0}
            verified={verified}
            pending={pending}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="um-eyebrow mb-3">Visible evidence</p>
          {visible.length === 0 ? (
            <EmptyState
              title="No Kilimani reports match these filters"
              body="Widen the filters or report a hazard you see on the street."
            />
          ) : (
            <div className="space-y-3">
              {visible.slice(0, 40).map((incident) => (
                <ReportCard key={incident.id} incident={incident} onSelect={selectReport} />
              ))}
            </div>
          )}
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
    <div className="rounded-card border border-civic-line bg-civic-surface px-3.5 py-3 shadow-card lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      {loading ? (
        <p className="um-meta">Loading Kilimani evidence…</p>
      ) : (
        <>
          <p className="text-base font-semibold tracking-tight text-civic-ink">
            {verified} community-supported
          </p>
          <p className="um-meta mt-0.5">
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
        <label htmlFor={listId + "-q"} className="um-eyebrow mb-1.5 block">
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
      <p className="um-eyebrow pt-2">
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
      <p className="um-eyebrow pt-2">
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
      className={`shrink-0 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors ${
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