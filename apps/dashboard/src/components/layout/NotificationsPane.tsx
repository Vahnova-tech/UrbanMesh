import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchClusters, fetchReports } from "../../lib/api";
import { formatRelative } from "../../lib/format";
import {
  buildPlannerNotices,
  loadReadPlannerNoticeIds,
  saveReadPlannerNoticeIds,
  type PlannerNotice,
  type PlannerNoticeKind,
} from "../../lib/notices";
import { ErrorNotice } from "../ui/Primitives";

export function usePlannerNotices() {
  const [notices, setNotices] = useState<PlannerNotice[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadPlannerNoticeIds());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [clusters, reports] = await Promise.all([fetchClusters(), fetchReports()]);
        if (cancelled) return;
        setNotices(buildPlannerNotices(clusters, reports));
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load Kilimani updates. Try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [reload]);

  const unreadCount = useMemo(
    () => notices.filter((row) => !readIds.has(row.id)).length,
    [notices, readIds],
  );

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadPlannerNoticeIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const row of notices) next.add(row.id);
      saveReadPlannerNoticeIds(next);
      return next;
    });
  }, [notices]);

  return {
    notices,
    unreadCount,
    readIds,
    error,
    loading,
    markRead,
    markAllRead,
    retry: () => {
      setLoading(true);
      setReload((n) => n + 1);
    },
  };
}

export function NotificationsPane({
  open,
  onClose,
  notices,
  readIds,
  unreadCount,
  loading,
  error,
  onRetry,
  onRead,
  onReadAll,
}: {
  open: boolean;
  onClose: () => void;
  notices: PlannerNotice[];
  readIds: Set<string>;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2200] flex justify-end">
      <button
        type="button"
        aria-label="Close updates"
        className="absolute inset-0 bg-civic-ink/25"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-updates-title"
        className="relative flex h-full w-full max-w-[380px] flex-col border-l border-civic-line bg-civic-surface shadow-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-civic-line px-4 py-3">
          <div>
            <h2 id="planner-updates-title" className="text-base font-semibold tracking-tight">
              Updates
            </h2>
            <p className="mt-0.5 text-xs font-medium text-civic-muted">
              {unreadCount === 0
                ? "Verified clusters and pending Kilimani reports"
                : `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-civic-line px-3 text-xs font-semibold text-civic-slate"
          >
            Close
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
            LPDP desk
          </p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={onReadAll}
              className="text-xs font-semibold text-civic-accent"
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {error ? <ErrorNotice message={error} onRetry={onRetry} /> : null}
          {loading && notices.length === 0 ? (
            <p className="py-8 text-sm font-medium text-civic-muted">Loading updates…</p>
          ) : null}
          {!loading && notices.length === 0 && !error ? (
            <div className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center">
              <p className="text-sm font-semibold text-civic-ink">No updates yet</p>
              <p className="mt-1 text-sm text-civic-muted">
                Verified 15 m clusters and pending reports will appear here as residents file them.
              </p>
            </div>
          ) : null}
          <ul className="space-y-2">
            {notices.map((notice) => {
              const unread = !readIds.has(notice.id);
              return (
                <li key={notice.id}>
                  <Link
                    to={notice.href}
                    onClick={() => {
                      onRead(notice.id);
                      onClose();
                    }}
                    className={`block rounded-card border border-civic-line px-3 py-3 ${
                      unread ? "bg-civic-mist" : "bg-civic-paper"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-civic-ink">{notice.title}</p>
                      <span className="shrink-0 text-[11px] font-medium text-civic-muted">
                        {formatRelative(notice.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-civic-slate">{notice.body}</p>
                    <p className="mt-2 text-[11px] font-semibold text-civic-accent">
                      {kindLabel(notice.kind)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function kindLabel(kind: PlannerNoticeKind): string {
  return kind === "cluster" ? "Verified cluster" : "Pending report";
}

export function NoticeBell({
  unreadCount,
  open,
  onToggle,
}: {
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={unreadCount > 0 ? `Updates, ${unreadCount} unread` : "Updates"}
      aria-expanded={open}
      title="Updates"
      className="relative inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-civic-line px-2.5 text-xs font-semibold text-civic-slate"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6.5 9.5a5.5 5.5 0 1 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M10 18.5a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span>Updates</span>
      {unreadCount > 0 ? (
        <span className="min-w-4 rounded-full bg-civic-critical px-1 text-[10px] font-semibold leading-4 text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

export function PlannerUpdates() {
  const { pathname, search } = useLocation();
  const notices = usePlannerNotices();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);

  return (
    <>
      <NoticeBell
        unreadCount={notices.unreadCount}
        open={open}
        onToggle={() => setOpen((value) => !value)}
      />
      <NotificationsPane
        open={open}
        onClose={() => setOpen(false)}
        notices={notices.notices}
        readIds={notices.readIds}
        unreadCount={notices.unreadCount}
        loading={notices.loading}
        error={notices.error}
        onRetry={notices.retry}
        onRead={notices.markRead}
        onReadAll={notices.markAllRead}
      />
    </>
  );
}
