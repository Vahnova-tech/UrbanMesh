import { Link } from "react-router-dom";
import { PipelineStrip } from "../components/ui/Pipeline";

export function AboutPage() {
  return (
    <article className="um-enter mx-auto w-full max-w-[960px] px-4 py-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
        Kilimani · Nairobi City County
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight lg:text-3xl">
        About UrbanMesh
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-civic-slate lg:text-base">
        Residents report what they see. UrbanMesh verifies spatial patterns.
        Planners receive structured evidence for Kilimani’s Local Physical
        Development Plan — grounded in a neighbourhood of roughly{" "}
        <span className="font-semibold text-civic-ink">
          50,457 residents across 16.1 km²
        </span>{" "}
        (2019 census context).
      </p>

      <section className="mt-8 rounded-card border border-civic-line bg-civic-surface p-4">
        <h2 className="text-sm font-semibold">Not another complaint box</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Single reports stay <span className="font-semibold text-civic-ink">pending</span>.
          Only when <span className="font-semibold text-civic-ink">three or more</span>{" "}
          same-category reports land within <span className="font-semibold text-civic-ink">15 metres</span>{" "}
          does UrbanMesh auto-cluster and <span className="font-semibold text-civic-ink">self-verify</span>{" "}
          the hazard. That programmatic trust filter is what feeds the heatmap and the LPDP brief.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">How a report becomes evidence</h2>
        <div className="mt-3">
          <PipelineStrip />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold">How verification works</h2>
          <ol className="mt-3 space-y-3 text-sm leading-relaxed text-civic-slate">
            <li>1. A resident reports a point hazard on Kilimani streets.</li>
            <li>2. Nearby reports of the same type become evidence — not likes.</li>
            <li>3. Three reports within 15 m verify a spatial cluster.</li>
            <li>4. Only verified clusters feed the walkability heatmap.</li>
            <li>5. Nairobi County can export them as LPDP planning evidence.</li>
          </ol>
        </section>

        <section className="rounded-card border border-civic-line bg-civic-surface p-4">
          <h2 className="text-sm font-semibold">What you will see on the map</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-civic-slate">
            <li>
              <span className="font-semibold text-civic-ink">Pending</span> — an
              individual report, still waiting for nearby confirmation.
            </li>
            <li>
              <span className="font-semibold text-civic-ink">Community verified</span>{" "}
              — three or more same-category reports within 15 metres.
            </li>
          </ul>
        </section>
      </div>

      <section className="mt-8 rounded-card border border-civic-line bg-civic-surface p-4">
        <h2 className="text-sm font-semibold">Install on this phone</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Chrome and Edge show an install icon in the UrbanMesh header when
          the app can be added. On iPhone, open Share and choose Add to Home
          Screen. The map and reports you already loaded stay available if
          the network drops; new reports still need a connection.
        </p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-civic-line bg-civic-surface p-4">
          <h2 className="text-sm font-semibold">Built for low bandwidth</h2>
          <p className="mt-2 text-sm leading-relaxed text-civic-slate">
            The citizen app is a lightweight, mobile-first Progressive Web App —
            map code loads after the shell, so reporting still works on slower
            Nairobi mobile networks.
          </p>
        </section>
        <section className="rounded-card border border-civic-line bg-civic-surface p-4">
          <h2 className="text-sm font-semibold">Privacy by scope</h2>
          <p className="mt-2 text-sm leading-relaxed text-civic-slate">
            No public profile on this phone. We deliberately exclude sensitive
            domains such as crime logs or water-rationing schedules — UrbanMesh
            stays on tangible street hazards only. Reports you submit for “My
            Reports” stay on this device.
          </p>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/report"
          className="inline-flex min-h-12 items-center justify-center rounded-card bg-civic-accent px-4 text-sm font-semibold text-white"
        >
          Report a hazard
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-12 items-center justify-center rounded-card border border-civic-line px-4 text-sm font-semibold"
        >
          Open the map
        </Link>
      </div>
    </article>
  );
}
