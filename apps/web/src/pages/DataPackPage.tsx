import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../components/ui/Button";
import { NAV_PILL_OFFSET } from "../components/layout/AppShell";
import { useNeighbourhood } from "../lib/neighbourhood";
import {
  fetchDataPack,
  type DataPackResponse,
  type GlanceIndicator,
} from "../lib/api";

export function DataPackPage() {
  const { id, neighbourhood, setNeighbourhood } = useNeighbourhood();
  const [pack, setPack] = useState<DataPackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id !== "kileleshwa") setNeighbourhood("kileleshwa");
  }, [id, setNeighbourhood]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchDataPack("kileleshwa")
      .then((data) => {
        if (!cancelled) setPack(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load data pack.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`um-scroll h-full ${NAV_PILL_OFFSET}`}>
      <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-4 lg:px-6 lg:pt-8">
        <p className="um-eyebrow">Kileleshwa Data Package</p>
        <h1 className="mt-3 max-w-[18ch] text-3xl font-semibold tracking-tight text-civic-ink sm:text-4xl">
          {pack?.title ?? "Growing Better: Community-Led Planning for Kileleshwa"}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-civic-slate">
          {pack?.introduction ??
            "A structured evidence resource for community-led planning. Missing statistics stay TBD — never invented."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-civic-muted">
          <span className="rounded-md border border-civic-line bg-civic-surface px-2 py-1 font-semibold">
            Version {pack?.version ?? "…"}
          </span>
          <span className="rounded-md border border-civic-line bg-civic-surface px-2 py-1 font-semibold uppercase">
            {pack?.status ?? "draft"}
          </span>
          <span className="rounded-md border border-civic-line bg-civic-mist/60 px-2 py-1">
            Boundary: {neighbourhood.boundary_status.replace(/_/g, " ")}
          </span>
        </div>

        {error ? (
          <p className="mt-6 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}
        {loading && !pack ? (
          <p className="mt-8 text-sm text-civic-muted">Loading data pack…</p>
        ) : null}

        {pack ? (
          <>
            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-xl font-semibold text-civic-ink">
                Planning workflow
              </h2>
              <p className="mt-2 text-sm text-civic-slate">
                Understand → Investigate → Identify → Define → Design → Test
              </p>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pack.process_steps.map((step, i) => (
                  <li
                    key={step}
                    className="rounded-card border border-civic-line bg-civic-surface px-4 py-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-civic-muted">
                      Step {i + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-civic-ink">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-xl font-semibold text-civic-ink">
                Kileleshwa at a glance
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-civic-slate">
                Indicators appear only with sourced values. TBD means the figure is not
                yet established — not zero.
              </p>
              <p className="mt-2 text-xs text-civic-muted">
                {neighbourhood.boundary_note}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {pack.glance.map((row) => (
                  <GlanceCard key={row.id} row={row} />
                ))}
              </div>
            </section>

            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-xl font-semibold text-civic-ink">
                Map framing (provisional)
              </h2>
              <p className="mt-2 text-sm text-civic-slate">
                Interactive ward layers appear when authoritative geometry is ingested.
                Until then, UrbanMesh uses a provisional framing box for orientation only.
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Meta
                  label="Center (lat, lng)"
                  value={`${neighbourhood.center[0]}, ${neighbourhood.center[1]}`}
                />
                <Meta
                  label="Boundary source"
                  value={neighbourhood.boundary_source}
                />
              </dl>
              <ButtonLink to="/" className="mt-5 min-h-11 rounded-full px-4">
                Open explore map
              </ButtonLink>
            </section>

            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-xl font-semibold text-civic-ink">
                Community concern taxonomy
              </h2>
              <p className="mt-2 text-sm text-civic-slate">
                Distinct from Kilimani’s six infrastructure hazard categories. No
                submissions are implied by listing these labels.
              </p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pack.concern_taxonomy.map((c) => (
                  <li
                    key={c.code}
                    className="rounded-card border border-civic-line bg-civic-surface px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-civic-ink">{c.label}</p>
                    <p className="mt-1 text-xs text-civic-muted">{c.description}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-xl font-semibold text-civic-ink">
                Development and land-use change
              </h2>
              <p className="mt-2 text-sm text-civic-slate">
                Time-series imagery, footprint change, and planning references will
                appear here when comparable, licensed sources are available. Observable
                change is shown separately from impact judgements.
              </p>
              <p className="mt-4 rounded-card border border-civic-line bg-civic-mist/40 px-4 py-3 text-sm text-civic-muted">
                Timeline, before/after viewer, and change layers: not yet available —
                no sourced historical series ingested.
              </p>
            </section>

            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-xl font-semibold text-civic-ink">
                Community-reported concerns
              </h2>
              <p className="mt-2 text-sm text-civic-slate">
                Evidence records will list here once published through review. Listing
                the taxonomy does not imply KIWANA field confirmation or that reports
                already exist.
              </p>
              <p className="mt-4 rounded-card border border-civic-line bg-civic-mist/40 px-4 py-3 text-sm text-civic-muted">
                No published concern records yet.
              </p>
            </section>

            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-xl font-semibold text-civic-ink">
                Data catalogue
              </h2>
              <p className="mt-2 text-sm text-civic-slate">
                Open-tier metadata only. Restricted downloads are never exposed on this
                page.
              </p>
              {pack.datasets.length === 0 ? (
                <p className="mt-4 text-sm text-civic-muted">
                  No open datasets published yet.
                </p>
              ) : (
                <ul className="mt-6 space-y-3">
                  {pack.datasets.map((d) => (
                    <li
                      key={d.id}
                      className="rounded-card border border-civic-line bg-civic-surface px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-civic-ink">{d.title}</p>
                          <p className="mt-1 text-xs text-civic-slate">{d.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <TierBadge tier={d.access_tier} />
                          <span className="rounded-md bg-civic-mist px-2 py-0.5 text-[10px] font-semibold uppercase text-civic-muted">
                            {d.data_kind}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-civic-muted">
                        Source: {d.source_organization}
                        {d.license ? ` · Licence: ${d.license}` : ""}
                        {d.download_available ? "" : " · Download not available"}
                      </p>
                      <p className="mt-1 text-[11px] text-civic-muted">{d.quality_notes}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-12 grid gap-8 border-t border-civic-line pt-10 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-civic-ink">Limitations</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-civic-slate">
                  {pack.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-civic-ink">
                  Privacy & access tiers
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-civic-slate">
                  {pack.privacy_guidance.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-civic-slate">
                  {pack.recommended_use.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-12 border-t border-civic-line pt-10">
              <h2 className="text-lg font-semibold text-civic-ink">
                Participant problem definition
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-civic-slate">
                Interpretations submitted by participants are not established findings.
                Use this structure when proposing interventions.
              </p>
              <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-civic-slate">
                <li>Problem statement</li>
                <li>Geographic area (generalized)</li>
                <li>Supporting evidence (with sources)</li>
                <li>Affected groups (no personal identities)</li>
                <li>Assumptions and uncertainties</li>
                <li>Proposed intervention</li>
                <li>Implementation, operation, and maintenance</li>
                <li>Evaluation criteria</li>
              </ol>
            </section>
          </>
        ) : null}

        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink to="/" className="min-h-11 rounded-full px-4">
            Explore map
          </ButtonLink>
          <Link
            to="/about"
            className="inline-flex min-h-11 items-center rounded-full border border-civic-line px-4 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
          >
            About UrbanMesh
          </Link>
        </div>
      </div>
    </div>
  );
}

function GlanceCard({ row }: { row: GlanceIndicator }) {
  const display =
    row.status === "available" && row.value
      ? `${row.value}${row.unit ? ` ${row.unit}` : ""}`
      : row.status === "tbd"
        ? "TBD"
        : "Data unavailable";
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {row.label}
      </p>
      <p className="mt-1 text-lg font-semibold text-civic-ink">{display}</p>
      <p className="mt-2 text-[11px] text-civic-muted">
        {row.source_organization ?? "Source pending"}
        {row.reference_year ? ` · ${row.reference_year}` : ""}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.04em] text-civic-muted">
        Confidence: {row.confidence}
      </p>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const label =
    tier === "open"
      ? "Open & Safe"
      : tier === "restricted"
        ? "Restricted"
        : "Sample / Synthetic";
  return (
    <span className="rounded-md border border-civic-line px-2 py-0.5 text-[10px] font-semibold text-civic-slate">
      {label}
    </span>
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
