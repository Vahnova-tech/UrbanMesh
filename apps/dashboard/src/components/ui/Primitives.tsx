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

export function StatusBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center rounded-md bg-civic-verifiedBg px-2 py-0.5 text-[11px] font-semibold text-civic-verified">
      Community verified
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-civic-pendingBg px-2 py-0.5 text-[11px] font-semibold text-civic-pending">
      Pending
    </span>
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
    <div className="rounded-card border border-civic-line bg-civic-surface p-4 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function PipelineStrip() {
  const steps = [
    "Report",
    "Nearby reports",
    "Verified cluster",
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

export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-civic-line bg-civic-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {hint ? (
        <p className="mb-4 mt-1 text-xs leading-relaxed text-civic-muted">{hint}</p>
      ) : null}
      {children}
    </section>
  );
}
