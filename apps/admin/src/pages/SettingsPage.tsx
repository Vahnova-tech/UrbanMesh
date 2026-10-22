import { useEffect, useState } from "react";
import { verifySession } from "../lib/api";

export function SettingsPage() {
  const [rules, setRules] = useState<{
    cluster_threshold: number;
    cluster_radius_meters: number;
    note?: string;
  } | null>(null);

  useEffect(() => {
    void verifySession().then((s) => {
      if (s.rules) setRules(s.rules);
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-xl font-semibold text-civic-ink">Settings</h2>

        <dl className="mt-6 space-y-3">
          <div className="rounded-card border border-civic-line bg-civic-surface px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
              Community corroboration threshold
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {rules?.cluster_threshold ?? "—"} reports
            </dd>
          </div>
          <div className="rounded-card border border-civic-line bg-civic-surface px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
              Spatial radius
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {rules?.cluster_radius_meters ?? "—"} metres
            </dd>
          </div>
        </dl>

        {rules?.note ? (
          <p className="mt-4 text-sm text-civic-muted">{rules.note}</p>
        ) : null}
      </div>
    </div>
  );
}
