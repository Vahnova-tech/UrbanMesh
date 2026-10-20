import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EvidencePhoto } from "../components/EvidencePhoto";
import { MiniMap } from "../components/MiniMap";
import { ReportActions } from "../components/ReportActions";
import {
  fetchAdminDetail,
  type AdminAuditEntry,
  type AdminDetailResponse,
  type AdminIncident,
} from "../lib/api";
import { formatRelative, formatWhen } from "../lib/format";
import { ReviewBadge, actionLabel } from "../lib/status";

export function ReportDetailPage({ onLogout }: { onLogout: () => void }) {
  const { id = "" } = useParams();
  const [data, setData] = useState<AdminDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load report.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [id, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="h-full overflow-y-auto px-4 py-10 text-sm text-civic-muted lg:px-6">
        Loading report…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full overflow-y-auto px-4 py-10 lg:px-6">
        <p className="rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm font-medium text-civic-critical">
          {error}
        </p>
        <Link to="/queue" className="mt-4 inline-block text-sm font-semibold text-civic-accent">
          ← Back to queue
        </Link>
      </div>
    );
  }

  if (!data) return null;
  const { incident, nearby, cluster_members, audit, rules } = data;
  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
          <Link to="/queue" className="font-semibold text-civic-accent hover:underline">
            ← Review queue
          </Link>
          <span className="text-civic-line">·</span>
          <Link to="/reports" className="font-semibold text-civic-muted hover:text-civic-ink">
            All reports
          </Link>
          <span className="text-civic-line">·</span>
          <Link to="/map" className="font-semibold text-civic-muted hover:text-civic-ink">
            Map
          </Link>
        </div>

        {error ? (
          <p className="mb-4 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm font-medium text-civic-critical">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="um-eyebrow">{incident.category_label}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-civic-ink">
              {incident.description.split(/[.!?]/)[0]}
            </h2>
            <p className="mt-2 font-mono text-xs text-civic-muted">
              {incident.id} · submitted {formatWhen(incident.created_at)} EAT
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ReviewBadge status={incident.review_status} />
            {incident.community_supported ? (
              <span className="rounded-md bg-civic-verifiedBg px-2 py-1 text-[11px] font-semibold text-civic-verified">
                Community-supported
              </span>
            ) : (
              <span className="rounded-md bg-civic-pendingBg px-2 py-1 text-[11px] font-semibold text-civic-pending">
                Spatial pending
              </span>
            )}
            {incident.field_verified ? (
              <span className="rounded-md bg-civic-accent/15 px-2 py-1 text-[11px] font-semibold text-civic-accent">
                Field-verified
                {incident.field_verified_at
                  ? ` · ${formatRelative(incident.field_verified_at)}`
                  : ""}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <ReportActions
            incident={incident}
            nearbyIds={nearby.map((n) => n.id)}
            onDone={load}
            onError={(msg) => {
              setError(msg);
              if (/sign-in/i.test(msg)) onLogout();
            }}
          />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-civic-slate">
          {incident.description}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-civic-ink">
              Evidence & location
            </h3>
            <EvidencePhoto
              url={incident.photo_url}
              className="max-h-80 w-full rounded-card border border-civic-line object-cover"
            />
            <MiniMap
              lat={incident.lat}
              lng={incident.lng}
              className="h-56 w-full"
              interactive
            />
            <dl className="grid gap-2 sm:grid-cols-2">
              <Meta label="Corridor" value={incident.corridor} />
              <Meta label="Ward" value={incident.ward_name} />
              <Meta
                label="Coordinates"
                value={`${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`}
              />
              <Meta
                label="Eligible nearby"
                value={`${incident.nearby_count} within ${rules.cluster_radius_meters} m (threshold ${rules.cluster_threshold})`}
              />
              {incident.review_note ? (
                <Meta label="Admin note / reason" value={incident.review_note} />
              ) : null}
              {incident.resolution_note ? (
                <Meta label="Resolution note" value={incident.resolution_note} />
              ) : null}
              {incident.duplicate_of_id ? (
                <Meta
                  label="Duplicate of"
                  value={incident.duplicate_of_id.slice(0, 8).toUpperCase()}
                />
              ) : null}
            </dl>
          </section>

          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-civic-ink">
                Verification
              </h3>
              <p className="mt-1 text-xs text-civic-muted">
                Community-supported reflects spatial corroboration only — not a
                field inspection.
              </p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <Meta
                  label="Community-supported"
                  value={incident.community_supported ? "Yes" : "No"}
                />
                <Meta
                  label="Field-verified"
                  value={
                    incident.field_verified
                      ? `Yes${incident.field_verified_at ? ` · ${formatWhen(incident.field_verified_at)}` : ""}`
                      : "No"
                  }
                />
                <Meta
                  label="Cluster"
                  value={incident.cluster_id?.slice(0, 8).toUpperCase() ?? "None"}
                />
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-civic-ink">
                Nearby submissions
              </h3>
              <RelatedList items={nearby} empty="No eligible nearby same-category reports." />
            </div>

            {cluster_members.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-civic-ink">
                  Cluster members
                </h3>
                <RelatedList items={cluster_members} empty="" />
              </div>
            ) : null}

            <div id="history">
              <h3 className="text-sm font-semibold text-civic-ink">
                Audit history
              </h3>
              <p className="mt-1 text-xs text-civic-muted">
                Who changed what, when, and why.
              </p>
              <AuditList entries={audit} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RelatedList({
  items,
  empty,
}: {
  items: AdminIncident[];
  empty: string;
}) {
  if (items.length === 0) {
    return empty ? (
      <p className="mt-3 text-sm text-civic-muted">{empty}</p>
    ) : null;
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.map((row) => (
        <li key={row.id}>
          <Link
            to={`/reports/${row.id}`}
            className="block rounded-card border border-civic-line bg-civic-mist/30 px-3 py-2 hover:bg-civic-mist"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="line-clamp-1 text-sm font-semibold text-civic-ink">
                {row.description}
              </p>
              <ReviewBadge status={row.review_status} />
            </div>
            <p className="mt-0.5 text-xs text-civic-muted">
              {row.id.slice(0, 8).toUpperCase()} · {formatRelative(row.created_at)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AuditList({ entries }: { entries: AdminAuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="mt-3 text-sm text-civic-muted">No admin actions yet.</p>;
  }
  return (
    <ol className="mt-3 space-y-3 border-l border-civic-line pl-4">
      {entries.map((row) => (
        <li key={row.id} className="relative">
          <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-civic-accent" />
          <p className="text-sm font-semibold text-civic-ink">
            {actionLabel(row.action)}
          </p>
          <p className="text-xs text-civic-muted">
            {row.actor} · {formatWhen(row.created_at)} EAT
          </p>
          {row.reason ? (
            <p className="mt-1 text-xs text-civic-slate">{row.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
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
