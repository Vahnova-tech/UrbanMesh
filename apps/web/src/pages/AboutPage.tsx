import { PipelineStrip } from "../components/ui/Pipeline";
import { ButtonLink } from "../components/ui/Button";

export function AboutPage() {
  return (
    <article className="um-enter mx-auto w-full max-w-[960px] px-4 py-8 pb-[max(7.5rem,calc(6rem+env(safe-area-inset-bottom)))] md:pb-10 lg:px-6 lg:py-12">
      <p className="um-eyebrow">Kilimani · Nairobi City County</p>
      <h1 className="um-display mt-2">About UrbanMesh</h1>
      <p className="um-body mt-4 max-w-2xl text-base">
        Residents report street hazards they can see. UrbanMesh groups nearby
        same-category reports into community-supported clusters. Planners can use
        that spatial corroboration as Kilimani planning input — grounded in a
        neighbourhood of roughly{" "}
        <span className="font-semibold text-civic-ink">
          50,457 residents across 16.1 km²
        </span>{" "}
        (2019 census context). This is not a county inspection programme and not an
        official Local Physical Development Plan.
      </p>

      <section className="mt-10 rounded-card border border-civic-line bg-civic-surface p-5 lg:p-6">
        <h2 className="um-title text-base lg:text-lg">How corroboration works</h2>
        <p className="um-body mt-3">
          Single reports stay <span className="font-semibold text-civic-ink">Pending</span>.
          Only when <span className="font-semibold text-civic-ink">three or more</span>{" "}
          same-category reports land within <span className="font-semibold text-civic-ink">15 metres</span>{" "}
          does UrbanMesh auto-cluster them as{" "}
          <span className="font-semibold text-civic-ink">Community-supported</span>.
          That rule is spatial corroboration from residents — not a field visit by
          Nairobi City County.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="um-title text-base lg:text-lg">How a report becomes evidence</h2>
        <div className="mt-4">
          <PipelineStrip />
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="um-title text-base lg:text-lg">How reporting works</h2>
          <ol className="um-body mt-4 space-y-3">
            <li>1. A resident reports a point hazard on Kilimani streets.</li>
            <li>2. Nearby reports of the same type become corroboration — not likes.</li>
            <li>3. Three reports within 15 m create a community-supported cluster.</li>
            <li>4. Only those clusters feed the walkability heatmap.</li>
            <li>5. Planners can export them as Kilimani LPDP planning input, not as a statutory plan.</li>
          </ol>
        </section>

        <section className="rounded-card border border-civic-line bg-civic-surface p-5">
          <h2 className="um-title text-base lg:text-lg">What you will see on the map</h2>
          <ul className="um-body mt-4 space-y-3">
            <li>
              <span className="font-semibold text-civic-ink">Pending</span> — an
              individual report, still waiting for nearby same-category corroboration.
            </li>
            <li>
              <span className="font-semibold text-civic-ink">Community-supported</span>{" "}
              — three or more same-category reports within 15 metres. Not a field inspection.
            </li>
          </ul>
        </section>
      </div>

      <section className="mt-10 rounded-card border border-civic-line bg-civic-surface p-5 lg:p-6">
        <h2 className="um-title text-base lg:text-lg">Statuses that are not live yet</h2>
        <ul className="um-body mt-4 space-y-3">
          <li>
            <span className="font-semibold text-civic-ink">Field-verified</span> —
            a county or partner inspector would confirm the site in person. UrbanMesh
            does not collect that status today, so it never appears as a badge on live reports.
          </li>
          <li>
            <span className="font-semibold text-civic-ink">Resolved</span> —
            works completed or the hazard removed. There is no resolution workflow yet.
          </li>
        </ul>
      </section>

      <section className="mt-10 rounded-card border border-civic-line bg-civic-surface p-5">
        <h2 className="um-title text-base lg:text-lg">Install on this phone</h2>
        <p className="um-body mt-3">
          Chrome and Edge show an install icon in the UrbanMesh header when
          the app can be added. On iPhone, open Share and choose Add to Home
          Screen. The map and reports you already loaded stay available if
          the network drops; new reports still need a connection.
        </p>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-civic-line bg-civic-surface p-5">
          <h2 className="um-title text-base lg:text-lg">Built for low bandwidth</h2>
          <p className="um-body mt-3">
            The citizen app is a lightweight, mobile-first Progressive Web App —
            map code loads after the shell, so reporting still works on slower
            Nairobi mobile networks.
          </p>
        </section>
        <section className="rounded-card border border-civic-line bg-civic-surface p-5">
          <h2 className="um-title text-base lg:text-lg">Privacy by scope</h2>
          <p className="um-body mt-3">
            No public profile on this phone. We deliberately exclude sensitive
            domains such as crime logs or water-rationing schedules — UrbanMesh
            stays on tangible street hazards only. Reports you submit for “My
            Reports” stay on this device.
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/report">Report an issue</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Open the map
        </ButtonLink>
      </div>
    </article>
  );
}
