import { useEffect } from "react";
import { Link } from "react-router-dom";
import { formatRelative } from "../../lib/format";
import type { Notice, NoticeKind } from "../../lib/notices";
import { ErrorBanner } from "../ui/ReportCard";

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
  notices: Notice[];
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
        aria-labelledby="updates-title"
        className="relative flex h-full w-full max-w-[380px] flex-col border-l border-civic-line bg-civic-surface shadow-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-civic-line px-4 py-3">
          <div>
            <h2 id="updates-title" className="text-base font-semibold tracking-tight">
              Updates
            </h2>
            <p className="mt-0.5 text-xs font-medium text-civic-muted">
              {unreadCount === 0
                ? "Kilimani reports from this phone and nearby clusters"
                : `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-xl border border-civic-line px-3 text-xs font-semibold text-civic-slate"
          >
            Close
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
            Live Kilimani
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

        <div className="um-scroll min-h-0 flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {error ? <ErrorBanner message={error} onRetry={onRetry} /> : null}
          {loading && notices.length === 0 ? (
            <p className="py-8 text-sm font-medium text-civic-muted">Loading updates…</p>
          ) : null}
          {!loading && notices.length === 0 && !error ? (
            <div className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center">
              <p className="text-sm font-semibold text-civic-ink">No updates yet</p>
              <p className="mt-1 text-sm text-civic-muted">
                Status changes on reports from this phone, and verified clusters near you, will
                appear here.
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
                    className={`block rounded-card border px-3 py-3 ${
                      unread
                        ? "border-civic-line bg-civic-mist"
                        : "border-civic-line bg-civic-paper"
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

function kindLabel(kind: NoticeKind): string {
  if (kind === "verified") return "Your report";
  if (kind === "nearby") return "Nearby cluster";
  return "Needs confirmation";
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
  const label =
    unreadCount > 0
      ? `Updates, ${unreadCount} unread`
      : "Updates";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      title="Updates"
      className="relative inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-civic-line px-2.5 text-xs font-semibold text-civic-slate"
    >
      <BellIcon />
      <span>Updates</span>
      {unreadCount > 0 ? (
        <span className="min-w-4 rounded-full bg-civic-critical px-1 text-[10px] font-semibold leading-4 text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

function BellIcon() {
  return (
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
  );
}
