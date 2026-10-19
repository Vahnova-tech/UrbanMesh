export const PIPELINE = [
  "Report",
  "Nearby reports",
  "Community-supported cluster",
  "Urban intelligence",
  "LPDP evidence",
] as const;

export function PipelineStrip({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <ol
      className={`flex flex-wrap gap-1.5 ${compact ? "" : "mb-1"}`}
      aria-label="How UrbanMesh turns reports into planning evidence"
    >
      {PIPELINE.map((step, i) => (
        <li
          key={step}
          className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-civic-muted"
        >
          {i > 0 ? <span className="mx-1.5 text-civic-line" aria-hidden>→</span> : null}
          <span className={compact ? "" : "text-civic-slate"}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`um-skeleton ${className}`} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-card border border-civic-line bg-civic-surface p-3"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}