import {
  CORROBORATION_THRESHOLD,
  corroborationCount,
  corroborationNeeded,
} from "../../lib/reportStatus";

export function CorroborationProgress({
  nearbyCount,
  verified,
}: {
  nearbyCount: number;
  verified: boolean;
}) {
  const count = Math.min(corroborationCount(nearbyCount), CORROBORATION_THRESHOLD);
  const needed = corroborationNeeded(nearbyCount);
  const pct = Math.round((count / CORROBORATION_THRESHOLD) * 100);

  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-3.5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="um-eyebrow">Community evidence</p>
          <p className="mt-1 text-sm font-semibold text-civic-ink">
            {count} of {CORROBORATION_THRESHOLD} qualifying reports
          </p>
        </div>
        <p className="shrink-0 text-xs font-semibold tabular-nums text-civic-muted">
          {pct}%
        </p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-civic-mist"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={CORROBORATION_THRESHOLD}
        aria-label="Corroboration progress"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            verified ? "bg-civic-verified" : "bg-civic-pending"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="um-meta mt-2.5">
        {verified
          ? "Threshold met: same-category reports within 15 m. Not a county inspection or confirmation that the hazard is fixed."
          : `${needed} more same-category report${needed === 1 ? "" : "s"} within 15 m needed for community support.`}
      </p>
    </div>
  );
}
