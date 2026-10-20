import { useCallback, useEffect, useState } from "react";
import {
  approveReport,
  fetchAdminReports,
  photoSrc,
  rejectReport,
  resetReport,
  type AdminIncident,
  type ReviewStatus,
} from "../lib/api";
import { formatRelative, formatWhen } from "../lib/format";

type Filter = ReviewStatus | "all";

export function QueuePage({ onLogout }: { onLogout: () => void }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminIncident[]>([]);
  const [summary, setSummary] = useState<Record<ReviewStatus, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminIncident | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminReports(filter);
      setItems(data.incidents);
      setSummary(data.summary);
      setSelected((prev) => {
        if (!prev) return data.incidents[0] ?? null;
        return data.incidents.find((row) => row.id === prev.id) ?? data.incidents[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load reports.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [filter, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    id: string,
    action: "approve" | "reject" | "reset",
  ) {
    setBusyId(id);
    setError(null);
    try {
      if (action === "approve") await approveReport(id, note);
      else if (action === "reject") await rejectReport(id, note);
      else await resetReport(id);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-civic-line bg-civic-surface px-4 py-3 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="um-eyebrow">Admin · Field review</p>
            <h1 className="text-lg font-semibold tracking-tight text-civic-ink">
              Report moderation queue
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-10 rounded-full border border-civic-line px-3.5 text-xs font-semibold text-civic-ink hover:bg-civic-mist"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="min-h-10 rounded-full border border-civic-line px-3.5 text-xs font-semibold text-civic-slate hover:bg-civic-mist"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="flex w-full shrink-0 flex-col lg:w-[380px]">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat label="Pending" value={summary.pending} />
            <Stat label="Approved" value={summary.approved} />
            <Stat label="Rejected" value={summary.rejected} />
          </div>

          <div
            role="group"
            aria-label="Filter by review status"
            className="mb-3 inline-flex w-full rounded-full border border-civic-line bg-civic-mist/60 p-0.5"
          >
            {(
              [
                { id: "pending", label: "Queue" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
                { id: "all", label: "All" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                aria-pressed={filter === opt.id}
                className={`min-h-9 flex-1 rounded-full px-2 text-[11px] font-semibold ${
                  filter === opt.id
                    ? "bg-civic-surface text-civic-ink shadow-sm"
                    : "text-civic-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
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
                onClick={() => {
                  setSelected(row);
                  setNote(row.review_note ?? "");
                }}
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
                  {row.is_verified ? " · Community-supported" : ""}
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
            <Detail
              incident={selected}
              note={note}
              onNote={setNote}
              busy={busyId === selected.id}
              onApprove={() => void runAction(selected.id, "approve")}
              onReject={() => void runAction(selected.id, "reject")}
              onReset={() => void runAction(selected.id, "reset")}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({
  incident,
  note,
  onNote,
  busy,
  onApprove,
  onReject,
  onReset,
}: {
  incident: AdminIncident;
  note: string;
  onNote: (value: string) => void;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
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
            Ref · {incident.id.slice(0, 8).toUpperCase()} · {formatWhen(incident.created_at)} EAT
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewBadge status={incident.review_status} />
          {incident.is_verified ? (
            <span className="rounded-md bg-civic-verifiedBg px-2 py-1 text-[11px] font-semibold text-civic-verified">
              Community-supported
            </span>
          ) : (
            <span className="rounded-md bg-civic-pendingBg px-2 py-1 text-[11px] font-semibold text-civic-pending">
              Spatial pending
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-civic-slate">{incident.description}</p>

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

      <label className="mt-6 block text-xs font-semibold text-civic-slate">
        Review note (optional)
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-card border border-civic-line bg-civic-paper px-3 py-2 text-sm text-civic-ink outline-none focus:border-civic-accent"
          placeholder="Reason for approval or rejection…"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card bg-civic-accent px-4 text-sm font-semibold text-white hover:bg-civic-accentDark disabled:opacity-60 sm:flex-none"
        >
          {busy ? "Saving…" : "Approve (field verify)"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card border border-civic-critical/30 bg-civic-criticalBg px-4 text-sm font-semibold text-civic-critical hover:bg-civic-critical/10 disabled:opacity-60 sm:flex-none"
        >
          Reject / hide
        </button>
        {incident.review_status !== "pending" ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReset}
            className="inline-flex min-h-11 items-center justify-center rounded-card border border-civic-line px-4 text-sm font-semibold text-civic-ink hover:bg-civic-mist disabled:opacity-60"
          >
            Reset to queue
          </button>
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-civic-muted">
        Rejected reports are removed from the public citizen map and listings. Approval is a
        field-review mark — it does not replace the ≥3 / 15 m community corroboration rule.
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

function ReviewBadge({ status }: { status: ReviewStatus }) {
  if (status === "approved") {
    return (
      <span className="rounded-md bg-civic-verifiedBg px-2 py-0.5 text-[10px] font-semibold text-civic-verified">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-md bg-civic-criticalBg px-2 py-0.5 text-[10px] font-semibold text-civic-critical">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-md bg-civic-pendingBg px-2 py-0.5 text-[10px] font-semibold text-civic-pending">
      Needs review
    </span>
  );
}
