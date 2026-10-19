import type { ReactNode } from "react";
import { photoSrc } from "../../lib/api";

export function EvidencePhoto({
  url,
  alt,
  className = "h-14 w-14",
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  const src = photoSrc(url);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={`shrink-0 rounded-[10px] object-cover ${className}`}
    />
  );
}

export function statusLabel(verified: boolean): string {
  return verified ? "Community-supported" : "Pending";
}

export function StatusBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-civic-verifiedBg px-2 py-0.5 text-[11px] font-semibold text-civic-verified">
      <CheckIcon />
      Community-supported
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-civic-pendingBg px-2 py-0.5 text-[11px] font-semibold text-civic-pending">
      <ClockIcon />
      Pending
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 3.8V6l1.7 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-4 py-5 shadow-card">
      <p className="um-eyebrow">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-civic-ink">{value}</p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-civic-line bg-civic-surface px-5 py-10 text-center">
      <p className="um-title text-base lg:text-lg">{title}</p>
      <p className="um-body mx-auto mt-2 max-w-md">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function PipelineStrip() {
  const steps = [
    "Report",
    "Nearby reports",
    "Community-supported cluster",
    "Urban intelligence",
    "LPDP evidence",
  ];
  return (
    <ol
      className="flex flex-wrap gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-civic-muted"
      aria-label="Evidence pipeline"
    >
      {steps.map((step, i) => (
        <li key={step} className="inline-flex items-center">
          {i > 0 ? <span className="mx-1.5 text-civic-line" aria-hidden>→</span> : null}
          <span className="text-civic-slate">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`um-skeleton ${className}`} />;
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-civic-critical/20 bg-civic-criticalBg px-4 py-3 text-sm font-medium leading-snug text-civic-critical"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-semibold underline underline-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-civic-line bg-civic-surface p-5 shadow-card lg:p-6">
      <header className="mb-5">
        <h2 className="um-title text-base lg:text-lg">{title}</h2>
        {hint ? <p className="um-meta mt-1.5">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
