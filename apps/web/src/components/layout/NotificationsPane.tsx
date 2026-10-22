import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { formatRelative } from "../../lib/format";
import type { Notice, NoticeKind } from "../../lib/notices";
import { ErrorBanner } from "../ui/ReportCard";

export function NotificationsPane({
  open,
  anchorRef,
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
  anchorRef: RefObject<HTMLButtonElement | null>;
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
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    function placePopup() {
      const anchor = anchorRef.current;
      const width = Math.min(352, window.innerWidth - 24);
      if (!anchor) {
        setPlace({ top: 72, right: 12 });
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const right = Math.min(
        Math.max(12, window.innerWidth - rect.right),
        window.innerWidth - width - 12,
      );
      setPlace({ top: rect.bottom + 10, right });
    }
    placePopup();
    window.addEventListener("resize", placePopup);
    return () => window.removeEventListener("resize", placePopup);
  }, [open, anchorRef]);

  if (!open || !place) return null;

  return (
    <div className="fixed inset-0 z-[2200]">
      <button
        type="button"
        aria-label="Close updates"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="um-map-card um-pop absolute flex w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.35rem]"
        style={{
          top: place.top,
          right: place.right,
          maxHeight: `min(28rem, calc(100dvh - ${place.top}px - 5.25rem))`,
        }}
      >
        <div className="flex items-center gap-2 border-b border-civic-line/80 px-3 py-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-civic-mist text-civic-accent">
            <BellIcon />
          </span>
          <h2 id={titleId} className="text-sm font-semibold tracking-tight text-civic-ink">
            Updates
          </h2>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-civic-accent px-1.5 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <div className="ml-auto flex items-center">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={onReadAll}
                className="rounded-full px-2 py-1 text-[11px] font-semibold text-civic-accent"
              >
                Mark read
              </button>
            ) : null}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-civic-slate hover:bg-civic-mist"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="um-scroll min-h-0 flex-1 px-2 py-2">
          {error ? <ErrorBanner message={error} onRetry={onRetry} /> : null}
          {loading && notices.length === 0 && !error ? (
            <p className="px-2 py-8 text-center text-sm font-medium text-civic-muted">Loading…</p>
          ) : null}
          {!loading && notices.length === 0 && !error ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-civic-ink">No updates yet</p>
              <p className="mt-1 text-xs leading-relaxed text-civic-muted">
                Report status and nearby clusters appear here.
              </p>
            </div>
          ) : null}
          <ul className="space-y-1">
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
                    className={`flex gap-2.5 rounded-2xl px-2.5 py-2.5 ${
                      unread ? "bg-civic-mist/80" : "hover:bg-civic-mist/50"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${kindDot(notice.kind)} ${
                        unread ? "" : "opacity-45"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-semibold leading-snug text-civic-ink">
                          {notice.title}
                        </span>
                        <span className="shrink-0 text-[10px] font-medium text-civic-muted">
                          {formatRelative(notice.at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-civic-slate">
                        {notice.body}
                      </span>
                      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-civic-muted">
                        {kindLabel(notice.kind)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function kindDot(kind: NoticeKind): string {
  if (kind === "verified") return "bg-civic-accent";
  if (kind === "nearby") return "bg-civic-pending";
  return "bg-civic-critical";
}

function kindLabel(kind: NoticeKind): string {
  if (kind === "verified") return "Your report";
  if (kind === "nearby") return "Nearby";
  return "Confirm";
}

export function NoticeBell({
  ref,
  unreadCount,
  open,
  onToggle,
  className = "relative inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-civic-line px-2.5 text-xs font-semibold text-civic-slate",
  compact = false,
}: {
  ref?: RefObject<HTMLButtonElement | null>;
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
  className?: string;
  compact?: boolean;
}) {
  const label = unreadCount > 0 ? `Updates, ${unreadCount} unread` : "Updates";
  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      title="Updates"
      className={`relative ${className}`}
    >
      <BellIcon />
      {compact ? null : <span>Updates</span>}
      {unreadCount > 0 ? (
        <span
          className={
            compact
              ? "absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-civic-critical px-1 text-[10px] font-semibold leading-4 text-white"
              : "min-w-4 rounded-full bg-civic-critical px-1 text-[10px] font-semibold leading-4 text-white"
          }
        >
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
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
