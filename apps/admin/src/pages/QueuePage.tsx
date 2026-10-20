import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReportActions } from "../components/ReportActions";
import {
  fetchAdminReports,
  photoSrc,
  type AdminIncident,
  type ReviewStatus,
} from "../lib/api";
import { HAZARD_CATEGORIES } from "../lib/categories";
import { formatRelative, formatWhen } from "../lib/format";
import { ReviewBadge } from "../lib/status";

type Filter = ReviewStatus | "all" | "queue";

export function QueuePage({ onLogout }: { onLogout: () => void }) {
  const [filter, setFilter] = useState<Filter>("queue");
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminIncident[]>([]);
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    resolved: 0,
    archived: 0,
    community_supported: 0,
    field_verified: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminIncident | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminReports({ review: filter, category, q });
      setItems(data.incidents);
      setSummary(data.summary);
      setSelected((prev) => {
        if (!prev) return data.incidents[0] ?? null;
        return (
          data.incidents.find((row) => row.id === prev.id) ??
          data.incidents[0] ??
          null
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load reports.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [filter, category, q, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
      <aside className="flex w-full shrink-0 flex-col lg:w-[380px]">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat label="Queue" value={summary.pending + summary.flagged} />
          <Stat label="Field OK" value={summary.field_verified} />
          <Stat label="Resolved" value={summary.resolved} />
        </div>

        <div
          role="group"
          aria-label="Filter by review status"
          className="mb-3 flex flex-wrap gap-1"
        >
          {(
            [
              { id: "queue", label: "Queue" },
              { id: "flagged", label: "Flagged" },
              { id: "approved", label: "Verified" },
              { id: "resolved", label: "Resolved" },
              { id: "rejected", label: "Rejected" },
              { id: "archived", label: "Archived" },
              { id: "all", label: "All" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              aria-pressed={filter === opt.id}
              className={`min-h-8 rounded-full px-2.5 text-[11px] font-semibold ${
                filter === opt.id
                  ? "bg-civic-accent text-white"
                  : "border border-civic-line text-civic-muted hover:bg-civic-mist"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="min-h-9 flex-1 rounded-card border border-civic-line bg-civic-surface px-3 text-sm outline-none focus:border-civic-accent"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-9 max-w-[9rem] rounded-card border border-civic-line bg-civic-surface px-2 text-xs outline-none focus:border-civic-accent"
          >
            <option value="all">All categories</option>
            {HAZARD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="mb-3 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-xs font-medium text-civic-critical">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {loading ? (
            <p className="px-1 text-sm text-civic-muted">Loading queue…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center text-sm text-civic-slate">
              No reports in this filter.
            </p>
          ) : null}
          {items.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelected(row)}
              className={`w-full rounded-card border px-3 py-3 text-left transition-colors ${
                selected?.id === row.id
                  ? "border-civic-accent bg-civic-verifiedBg/40"
                  : "border-civic-line bg-civic-surface hover:bg-civic-mist/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="um-eyebrow">{row.category_label}</p>
                <ReviewBadge status={row.review_status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-civic-ink">
                {row.description}
              </p>
              <p className="mt-1 text-xs text-civic-muted">
                {row.corridor} · {formatRelative(row.created_at)}
                {row.community_supported ? " · Community-supported" : ""}
                {row.field_verified ? " · Field-verified" : ""}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-card border border-civic-line bg-civic-surface">
        {!selected ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center px-6 text-sm text-civic-muted">
            Select a report to review.
          </div>
        ) : (
          <QueueDetail
            incident={selected}
            onDone={load}
            onError={setError}
            onAuthFail={onLogout}
          />
        )}
      </section>
    </div>
  );
}

function QueueDetail({
  incident,
  onDone,
  onError,
  onAuthFail,
}: {
  incident: AdminIncident;
  onDone: () => Promise<void>;
  onError: (msg: string) => void;
  onAuthFail: () => void;
}) {
  const photo = photoSrc(incident.photo_url);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="um-eyebrow">{incident.category_label}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-civic-ink">
            {incident.description.split(/[.!?]/)[0]}
          </h2>
          <p className="um-meta mt-2 text-xs text-civic-muted">
            Ref · {incident.id.slice(0, 8).toUpperCase()} ·{" "}
            {formatWhen(incident.created_at)} EAT
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewBadge status={incident.review_status} />
          {incident.community_supported ? (
            <span className="rounded-md bg-civic-verifiedBg px-2 py-1 text-[11px] font-semibold text-civic-verified">
              Community-supported
            </span>
          ) : (
            <span className="rounded-md bg-civic-pendingBg px-2 py-1 text-[11px] font-semibold text-civic-pending">
              Spatial pending
            </span>
          )}
          {incident.field_verified ? (
            <span className="rounded-md bg-civic-accent/15 px-2 py-1 text-[11px] font-semibold text-civic-accent">
              Field-verified
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-civic-slate">
        {incident.description}
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Meta label="Corridor" value={incident.corridor} />
        <Meta label="Ward" value={incident.ward_name} />
        <Meta
          label="Coordinates"
          value={`${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`}
        />
        <Meta
          label="Nearby same-category"
          value={`${incident.nearby_count} within 15 m`}
        />
      </dl>

      {photo ? (
        <img
          src={photo}
          alt=""
          className="mt-5 max-h-72 w-full rounded-card border border-civic-line object-cover"
        />
      ) : (
        <p className="mt-5 rounded-card border border-dashed border-civic-line px-4 py-8 text-center text-sm text-civic-muted">
          No photo attached
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to={`/reports/${incident.id}`}
          className="inline-flex min-h-10 items-center rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-ink hover:bg-civic-mist"
        >
          View details
        </Link>
        <Link
          to={`/reports/${incident.id}#history`}
          className="inline-flex min-h-10 items-center rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-ink hover:bg-civic-mist"
        >
          View history
        </Link>
      </div>

      <ReportActions
        incident={incident}
        onDone={async () => {
          try {
            await onDone();
          } catch (err) {
            if (err instanceof Error && /sign-in/i.test(err.message)) onAuthFail();
          }
        }}
        onError={(msg) => {
          onError(msg);
          if (/sign-in/i.test(msg)) onAuthFail();
        }}
      />

      <p className="mt-4 text-xs leading-relaxed text-civic-muted">
        Rejected and archived reports leave the public map. Field verification does not
        replace the ≥3 / 15 m community corroboration rule.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-civic-ink">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-civic-line/80 bg-civic-mist/40 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-civic-ink">{value}</dd>
    </div>
  );
}
