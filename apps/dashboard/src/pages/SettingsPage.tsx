import { useEffect, useState } from "react";
import { fetchMeta, type PlatformMeta } from "../lib/api";
import { Skeleton } from "../components/ui/Primitives";

export function SettingsPage() {
  const [meta, setMeta] = useState<PlatformMeta | null>(null);

  useEffect(() => {
    void fetchMeta().then(setMeta);
  }, []);

  if (!meta) {
    return (
      <div className="p-6 lg:p-7" aria-busy>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-72" />
        <Skeleton className="mt-6 h-64 w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8">
      <h1 className="um-display">Settings</h1>
      <dl className="mt-6 max-w-xl divide-y divide-civic-line rounded-card border border-civic-line bg-civic-surface">
        <Row label="Planning area" value={meta.planning_area} />
        <Row label="City" value={meta.city} />
        <Row label="County" value={meta.county} />
        <Row
          label="Community corroboration threshold"
          value={`${meta.cluster_threshold} same-category reports`}
        />
        <Row label="Cluster radius" value={`${meta.cluster_radius_meters} metres`} />
        <Row label="H3 resolution" value={String(meta.h3_resolution)} />
      </dl>
      <h2 className="mt-8 text-sm font-semibold">Pilot corridors</h2>
      <ul className="mt-3 max-w-xl space-y-2">
        {meta.corridors.map((c) => (
          <li
            key={c.id}
            className="rounded-card border border-civic-line bg-civic-surface px-4 py-3 text-sm"
          >
            <p className="font-semibold">{c.name}</p>
            <p className="text-civic-muted">{c.focus}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-civic-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
