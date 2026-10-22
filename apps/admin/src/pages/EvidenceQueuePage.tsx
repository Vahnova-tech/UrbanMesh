import { useCallback, useEffect, useState } from "react";
import { ActionDialog } from "../components/ActionDialog";
import {
  fetchAdminConcerns,
  runConcernAction,
  type AdminConcern,
  type ConcernAdminAction,
  type ConcernReviewStatus,
} from "../lib/api";
import { formatRelative, formatWhen } from "../lib/format";

type Filter = ConcernReviewStatus | "all" | "queue";

const STATUS_STYLES: Record<string, string> = {
  under_review: "bg-sky-100 text-sky-800",
  accepted: "bg-civic-verifiedBg text-civic-verified",
  rejected: "bg-civic-criticalBg text-civic-critical",
  archived: "bg-civic-mist text-civic-muted",
};

function statusLabel(status: string): string {
  switch (status) {
    case "under_review":
      return "Under review";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function ConcernBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
        STATUS_STYLES[status] ?? "bg-civic-pendingBg text-civic-pending"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function EvidenceQueuePage({ onLogout }: { onLogout: () => void }) {
  const [filter, setFilter] = useState<Filter>("queue");
  const [neighbourhood, setNeighbourhood] = useState<"all" | "kilimani" | "kileleshwa">(
    "all",
  );
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminConcern[]>([]);
  const [summary, setSummary] = useState({
    under_review: 0,
    accepted: 0,
    rejected: 0,
    archived: 0,
    synthetic: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminConcern | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminConcerns({
        status: filter,
        neighbourhood,
        q,
        limit: 200,
        offset: 0,
      });
      setItems(data.concerns);
      setSummary(data.summary);
      setSelected((prev) => {
        if (!prev) return data.concerns[0] ?? null;
        return (
          data.concerns.find((row) => row.id === prev.id) ??
          data.concerns[0] ??
          null
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load concerns.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [filter, neighbourhood, q, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
      <aside className="flex w-full shrink-0 flex-col lg:w-[380px]">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat label="Queue" value={summary.under_review} />
          <Stat label="Accepted" value={summary.accepted} />
          <Stat label="Synthetic" value={summary.synthetic} />
        </div>

        <div
          role="group"
          aria-label="Filter by review status"
          className="mb-3 flex flex-wrap gap-1"
        >
          {(
            [
              { id: "queue", label: "Queue" },
              { id: "under_review", label: "In review" },
              { id: "accepted", label: "Accepted" },
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
            value={neighbourhood}
            onChange={(e) =>
              setNeighbourhood(
                e.target.value as "all" | "kilimani" | "kileleshwa",
              )
            }
            className="min-h-9 max-w-[9rem] rounded-card border border-civic-line bg-civic-surface px-2 text-xs outline-none focus:border-civic-accent"
          >
            <option value="all">All areas</option>
            <option value="kileleshwa">Kileleshwa</option>
            <option value="kilimani">Kilimani</option>
          </select>
        </div>

        {error ? (
          <p className="mb-3 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-xs font-medium text-civic-critical">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {loading ? (
            <p className="px-1 text-sm text-civic-muted">Loading evidence…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center text-sm text-civic-slate">
              No concerns in this filter.
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
                <p className="um-eyebrow">{row.concern_type_label}</p>
                <ConcernBadge status={row.review_status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-civic-ink">
                {row.title}
              </p>
              <p className="mt-1 text-xs text-civic-muted">
                {row.neighbourhood_id} · {formatRelative(row.created_at)}
                {row.synthetic ? " · Synthetic" : ""}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-card border border-civic-line bg-civic-surface">
        {!selected ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center px-6 text-sm text-civic-muted">
            Select a concern to review.
          </div>
        ) : (
          <EvidenceDetail
            concern={selected}
            onDone={load}
            onError={setError}
            onAuthFail={onLogout}
          />
        )}
      </section>
    </div>
  );
}

function EvidenceDetail({
  concern,
  onDone,
  onError,
  onAuthFail,
}: {
  concern: AdminConcern;
  onDone: () => Promise<void>;
  onError: (msg: string) => void;
  onAuthFail: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<ConcernAdminAction | null>(null);

  async function run(action: ConcernAdminAction, reason: string) {
    setBusy(true);
    try {
      await runConcernAction(concern.id, action, reason || undefined);
      setDialog(null);
      await onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed.";
      onError(msg);
      if (/sign-in/i.test(msg)) onAuthFail();
    } finally {
      setBusy(false);
    }
  }

  const dialogMeta: Record<
    ConcernAdminAction,
    { title: string; confirm: string; destructive?: boolean; requireReason: boolean }
  > = {
    accept_for_publication: {
      title: "Accept for publication",
      confirm: "Accept",
      requireReason: false,
    },
    reject: {
      title: "Reject concern",
      confirm: "Reject",
      destructive: true,
      requireReason: true,
    },
    archive: {
      title: "Archive concern",
      confirm: "Archive",
      destructive: true,
      requireReason: true,
    },
    under_review: {
      title: "Return to review",
      confirm: "Mark under review",
      requireReason: false,
    },
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="um-eyebrow">{concern.concern_type_label}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-civic-ink">
            {concern.title}
          </h2>
          <p className="um-meta mt-2 text-xs text-civic-muted">
            Ref · {concern.id.slice(0, 8).toUpperCase()} ·{" "}
            {formatWhen(concern.created_at)} EAT
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConcernBadge status={concern.review_status} />
          {concern.synthetic ? (
            <span className="rounded-md border border-amber-500/40 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
              Synthetic
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setDialog("accept_for_publication")}
          className="min-h-10 rounded-card bg-civic-accent px-3 text-xs font-semibold text-white hover:bg-civic-accentDark disabled:opacity-60"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDialog("under_review")}
          className="min-h-10 rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-ink hover:bg-civic-mist disabled:opacity-60"
        >
          Under review
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDialog("reject")}
          className="min-h-10 rounded-card border border-civic-critical/40 px-3 text-xs font-semibold text-civic-critical hover:bg-civic-criticalBg disabled:opacity-60"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDialog("archive")}
          className="min-h-10 rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-muted hover:bg-civic-mist disabled:opacity-60"
        >
          Archive
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-civic-muted">
        Accept publishes to the public evidence list. Reject and archive require a
        reason. Coordinates are already generalized.
      </p>

      <p className="mt-4 text-sm leading-relaxed text-civic-slate">
        {concern.description}
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Meta label="Neighbourhood" value={concern.neighbourhood_id} />
        <Meta label="Evidence type" value={concern.evidence_type} />
        <Meta
          label="Area"
          value={concern.area_label ?? "Not specified"}
        />
        <Meta
          label="Coordinates"
          value={
            concern.lat != null && concern.lng != null
              ? `${concern.lat.toFixed(3)}, ${concern.lng.toFixed(3)}`
              : "None"
          }
        />
        {concern.source_ref ? (
          <Meta label="Source ref" value={concern.source_ref} />
        ) : null}
        {concern.review_note ? (
          <Meta label="Review note" value={concern.review_note} />
        ) : null}
      </dl>

      {dialog ? (
        <ActionDialog
          open
          title={dialogMeta[dialog].title}
          confirmLabel={dialogMeta[dialog].confirm}
          requireReason={dialogMeta[dialog].requireReason}
          destructive={dialogMeta[dialog].destructive}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => run(dialog, reason)}
        />
      ) : null}
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
