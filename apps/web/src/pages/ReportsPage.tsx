import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { HAZARD_OPTIONS } from "../lib/categories";
import { EvidenceEmpty, ErrorBanner, ReportCard } from "../components/ui/ReportCard";
import { ButtonLink } from "../components/ui/Button";
import { SkeletonList } from "../components/ui/Pipeline";
import { REPORT_NEW_PATH } from "../lib/reportStatus";

type SortKey = "newest" | "updated" | "corroborated";
type StatusFilter = "all" | "verified" | "pending";
type ViewMode = "list" | "map";

const HAZARD_CHIP: Record<string, string> = {
  MOBILITY_SURFACE_DAMAGE: "Road damage",
  NMT_PEDESTRIAN_HAZARD: "Obstruction",
  DRAINAGE_STORMWATER: "Drainage",
  SEWER_SANITATION: "Sanitation",
  LIGHTING_SECURITY: "Lighting",
  ILLEGAL_WASTE_DUMP: "Waste",
};

const PAGE_SIZE = 24;

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<IncidentPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [status, setStatus] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all",
  );
  const [sort, setSort] = useState<SortKey>(
    (searchParams.get("sort") as SortKey) || "newest",
  );
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchReports({ status: "all", limit: 500 });
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load Kilimani reports. Try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (category !== "all") next.set("category", category);
    if (status !== "all") next.set("status", status);
    if (sort !== "newest") next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }, [query, category, status, sort, setSearchParams]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let rows = items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (status === "verified" && !item.is_verified) return false;
      if (status === "pending" && item.is_verified) return false;
      if (needle) {
        const blob = [
          item.id,
          item.category_label,
          item.corridor,
          item.ward_name,
          item.description,
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(needle)) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "corroborated") {
        return (
          b.nearby_count - a.nearby_count ||
          b.created_at.localeCompare(a.created_at)
        );
      }
      return b.created_at.localeCompare(a.created_at);
    });
    return rows;
  }, [items, category, status, query, sort]);

  const filtersActive =
    category !== "all" || status !== "all" || query.trim().length > 0;

  const activeFilterCount =
    (category !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (query.trim() ? 1 : 0);

  function clearFilters() {
    setCategory("all");
    setStatus("all");
    setQuery("");
    setVisibleCount(PAGE_SIZE);
  }

  const page = filtered.slice(0, visibleCount);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 pb-[max(7.5rem,calc(6rem+env(safe-area-inset-bottom)))] md:pb-8 lg:px-6 lg:py-8">
      <header className="mb-5">
        <p className="um-eyebrow">Kilimani pilot · Nairobi</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight text-civic-ink lg:text-[1.75rem]">
              Street hazard reports
            </h1>
            <p className="mt-1.5 text-sm leading-snug text-civic-slate">
              Community-supported evidence means ≥3 same-category reports within 15 m —
              not a county inspection.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink to={REPORT_NEW_PATH} className="min-h-11 rounded-full px-4 text-sm">
              Report a hazard
            </ButtonLink>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-full border border-civic-line px-3.5 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
            >
              Explore map
            </Link>
          </div>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-civic-muted">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search streets, landmarks, or report ID…"
            className="min-h-11 w-full rounded-card border border-civic-line bg-civic-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-civic-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-card border border-civic-line px-3 text-sm font-semibold text-civic-ink hover:bg-civic-mist lg:hidden"
          aria-expanded={filtersOpen}
        >
          Filters
          {activeFilterCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-civic-accent px-1 text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="um-eyebrow">Hazard type</p>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-civic-accent"
            >
              Clear all
            </button>
          ) : null}
        </div>
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5 lg:flex-wrap">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All hazards
          </Chip>
          {HAZARD_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              active={category === opt.value}
              onClick={() => setCategory(opt.value)}
            >
              {HAZARD_CHIP[opt.value] ?? opt.label}
            </Chip>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Corroboration status"
            className="inline-flex rounded-full border border-civic-line bg-civic-mist/60 p-0.5"
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
                onClick={() => setStatus(opt.id)}
                aria-pressed={status === opt.id}
                className={`min-h-9 rounded-full px-3 text-xs font-semibold ${
                  status === opt.id
                    ? "bg-civic-surface text-civic-ink shadow-sm"
                    : "text-civic-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-civic-slate">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-9 rounded-full border border-civic-line bg-civic-surface px-3 text-xs font-semibold text-civic-ink"
            >
              <option value="newest">Newest</option>
              <option value="updated">Recently updated</option>
              <option value="corroborated">Most corroborated</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 border-y border-civic-line py-3">
        <p className="text-sm font-semibold text-civic-ink">
          {loading ? "Loading…" : `${filtered.length} report${filtered.length === 1 ? "" : "s"} found`}
        </p>
        <div
          role="group"
          aria-label="View mode"
          className="inline-flex rounded-full border border-civic-line p-0.5"
        >
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`min-h-8 rounded-full px-3 text-xs font-semibold ${
              view === "list" ? "bg-civic-mist text-civic-ink" : "text-civic-muted"
            }`}
          >
            List
          </button>
          <Link
            to="/"
            className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${
              view === "map" ? "bg-civic-mist text-civic-ink" : "text-civic-muted"
            }`}
            onClick={() => setView("map")}
          >
            Map
          </Link>
        </div>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : null}
      {loading ? <SkeletonList rows={4} /> : null}

      {!loading && filtered.length === 0 ? (
        <EvidenceEmpty onClear={clearFilters} filtersActive={filtersActive} />
      ) : null}

      {!loading && page.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {page.map((incident) => (
            <ReportCard key={incident.id} incident={incident} />
          ))}
        </div>
      ) : null}

      {!loading && visibleCount < filtered.length ? (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="mt-5 w-full min-h-11 rounded-card border border-civic-line text-sm font-semibold text-civic-ink hover:bg-civic-mist lg:w-auto lg:px-5"
        >
          Load more reports
        </button>
      ) : null}
    </div>
  );
}

function Chip({
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
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? "border-civic-ink bg-civic-ink text-civic-paper"
          : "border-civic-line bg-civic-surface text-civic-slate hover:bg-civic-mist"
      }`}
    >
      {children}
    </button>
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
