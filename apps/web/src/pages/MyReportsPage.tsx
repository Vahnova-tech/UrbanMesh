import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { loadMyReportIds } from "../lib/myReports";
import { formatWhen } from "../lib/format";
import { collapseRedundantReports } from "../lib/collapseReports";
import { isGroupResolved } from "../lib/resolvedReports";
import { ErrorBanner, EvidenceEmpty, ReportCard } from "../components/ui/ReportCard";
import { ButtonLink } from "../components/ui/Button";
import { SkeletonList } from "../components/ui/Pipeline";
import { CORROBORATION_THRESHOLD, REPORT_NEW_PATH } from "../lib/reportStatus";

type Filter = "all" | "pending" | "supported";

export function MyReportsPage() {
  const [items, setItems] = useState<IncidentPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [update, setUpdate] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [hideResolved, setHideResolved] = useState(true);
  const [resolvedTick, setResolvedTick] = useState(0);
  const knownVerified = useRef<Set<string> | null>(null);
  const submittedAt = useRef(new Map(loadMyReportIds().map((row) => [row.id, row.at])));

  useEffect(() => {
    let cancelled = false;
    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const mine = loadMyReportIds();
        submittedAt.current = new Map(mine.map((row) => [row.id, row.at]));
        const ids = new Set(mine.map((row) => row.id));
        const all = await fetchReports({ status: "all", limit: 500 });
        const next = all.filter((row) => ids.has(row.id));
        if (cancelled) return;
        const verifiedIds = new Set(next.filter((row) => row.is_verified).map((row) => row.id));
        if (knownVerified.current) {
          const newly = [...verifiedIds].filter((id) => !knownVerified.current?.has(id));
          if (newly.length > 0) {
            setUpdate(
              newly.length === 1
                ? "One of your reports is now community-supported."
                : `${newly.length} of your reports are now community-supported.`,
            );
          }
        }
        knownVerified.current = verifiedIds;
        setItems(next);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load your reports. Try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load(true);
    const timer = window.setInterval(() => void load(false), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [reload]);

  useEffect(() => {
    function sync() {
      setResolvedTick((n) => n + 1);
    }
    window.addEventListener("urbanmesh:resolved-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("urbanmesh:resolved-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const collapsed = useMemo(() => collapseRedundantReports(items), [items]);
  const pending = collapsed.filter((i) => !i.is_verified);
  const supported = collapsed.filter((i) => i.is_verified);

  const visible = useMemo(() => {
    let rows =
      filter === "pending"
        ? pending
        : filter === "supported"
          ? supported
          : collapsed;
    if (hideResolved) {
      rows = rows.filter((row) => !isGroupResolved(row.member_ids));
    }
    return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [collapsed, pending, supported, filter, hideResolved, resolvedTick]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 pb-[max(7.5rem,calc(6rem+env(safe-area-inset-bottom)))] md:pb-8 lg:px-6 lg:py-8">
      <header className="mb-5">
        <p className="um-eyebrow">Kilimani pilot · This device</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight text-civic-ink lg:text-[1.75rem]">
              My reports
            </h1>
            <p className="mt-1.5 text-sm leading-snug text-civic-slate">
              Stored on this phone only — no public profile. Track corroboration toward{" "}
              {CORROBORATION_THRESHOLD} same-category reports within 15 m.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink to={REPORT_NEW_PATH} className="min-h-11 rounded-full px-4 text-sm">
              Report a hazard
            </ButtonLink>
            <Link
              to="/reports"
              className="inline-flex min-h-11 items-center rounded-full border border-civic-line px-3.5 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
            >
              All reports
            </Link>
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Submitted" value={items.length} />
        <Stat label="Pending" value={pending.length} />
        <Stat label="Supported" value={supported.length} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Filter my reports"
          className="inline-flex w-full rounded-full border border-civic-line bg-civic-mist/60 p-0.5 sm:w-auto"
        >
          {(
            [
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "supported", label: "Supported" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              aria-pressed={filter === opt.id}
              className={`min-h-9 flex-1 rounded-full px-3 text-xs font-semibold sm:flex-none sm:px-4 ${
                filter === opt.id
                  ? "bg-civic-surface text-civic-ink shadow-sm"
                  : "text-civic-muted hover:text-civic-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-civic-slate">
          <input
            type="checkbox"
            checked={hideResolved}
            onChange={(e) => setHideResolved(e.target.checked)}
            className="h-4 w-4 rounded border-civic-line text-civic-accent focus:ring-civic-accent"
          />
          Hide resolved
        </label>
      </div>

      {update ? (
        <p className="mb-4 rounded-card border border-civic-verified/30 bg-civic-verifiedBg px-3.5 py-2.5 text-sm font-semibold text-civic-verified">
          {update}
        </p>
      ) : null}

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setReload((n) => n + 1)} />
        </div>
      ) : null}

      {loading ? <SkeletonList rows={3} /> : null}

      <div className="mb-3 flex items-center justify-between gap-2 border-y border-civic-line py-3">
        <p className="text-sm font-semibold text-civic-ink">
          {loading
            ? "Loading…"
            : `${visible.length} report${visible.length === 1 ? "" : "s"}`}
        </p>
        <p className="um-meta">
          {supported.length} community-supported · {pending.length} pending corroboration
        </p>
      </div>

      {!loading && items.length === 0 ? (
        <EvidenceEmpty />
      ) : null}

      {!loading && items.length > 0 && visible.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-base font-semibold text-civic-ink">No reports in this filter</p>
          <p className="um-body mx-auto mt-1.5 max-w-sm">
            Switch to All, or submit another hazard from this phone.
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-4 text-sm font-semibold text-civic-accent"
          >
            Show all my reports
          </button>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((incident) => {
            const loggedAt = incident.member_ids
              .map((id) => submittedAt.current.get(id))
              .find(Boolean);
            return (
              <ReportCard
                key={incident.member_ids.join("|")}
                incident={incident}
                memberIds={incident.member_ids}
                memberCount={incident.member_count}
                onCorroborated={() => setReload((n) => n + 1)}
                footnote={
                  loggedAt
                    ? `Logged on this device · ${formatWhen(loggedAt)}`
                    : incident.is_verified
                      ? "Now inside a community-supported cluster"
                      : "Waiting for more same-category reports within 15 m"
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-civic-ink">{value}</p>
    </div>
  );
}
