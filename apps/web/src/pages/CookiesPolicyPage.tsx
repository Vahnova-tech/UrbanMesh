import { Link } from "react-router-dom";
import { ButtonLink } from "../components/ui/Button";
import { UrbanMeshLogo } from "../components/ui/UrbanMeshLogo";

const UPDATED = "20 October 2026";

const STORAGE_ROWS = [
  {
    name: "urbanmesh.colorScheme",
    purpose: "Remembers light or dark theme on this device.",
    type: "Local storage",
    duration: "Until you clear site data",
  },
  {
    name: "urbanmesh.myReports",
    purpose: "Keeps report IDs you submitted on this phone for “My reports”. No public profile.",
    type: "Local storage",
    duration: "Until you clear site data (capped list)",
  },
  {
    name: "urbanmesh.noticeRead",
    purpose: "Tracks which in-app update notices you have already opened.",
    type: "Local storage",
    duration: "Until you clear site data",
  },
  {
    name: "urbanmesh.resolvedReports",
    purpose: "Stores hazards you marked resolved on this device only.",
    type: "Local storage",
    duration: "Until you clear site data",
  },
  {
    name: "urbanmesh.storageNotice",
    purpose: "Remembers that you dismissed the storage notice banner.",
    type: "Local storage",
    duration: "Until you clear site data",
  },
  {
    name: "urbanmesh.walkthrough",
    purpose: "Remembers that you finished or skipped the first-run tour.",
    type: "Local storage",
    duration: "Until you clear site data",
  },
] as const;

export function CookiesPolicyPage() {
  return (
    <article className="um-enter mx-auto w-full max-w-[720px] px-4 py-8 pb-[max(7.5rem,calc(6rem+env(safe-area-inset-bottom)))] md:pb-12 lg:px-6 lg:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-civic-ink">
        Cookies
      </h1>
      <p className="mt-2 text-sm text-civic-slate">
        How this app stores data on your device.
      </p>
      <p className="um-meta mt-3">Last updated · {UPDATED}</p>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">Short version</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-civic-slate">
          <li>
            UrbanMesh does <span className="font-semibold text-civic-ink">not</span> use
            advertising cookies or third-party marketing trackers.
          </li>
          <li>
            Most preferences live in{" "}
            <span className="font-semibold text-civic-ink">browser local storage</span> on
            this device, not in classic HTTP cookies.
          </li>
          <li>
            Hazard reports you submit are sent to the UrbanMesh API so the map and
            community evidence can work. “My reports” IDs stay on this phone.
          </li>
          <li>
            Map tiles may be requested from OpenFreeMap / OpenStreetMap infrastructure,
            which can process technical request data under their own terms.
          </li>
        </ul>
      </section>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">What this covers</h2>
        <p className="mt-4 text-sm leading-relaxed text-civic-slate">
          Laws and browsers often treat cookies, local storage, session storage, and
          similar device storage together. UrbanMesh’s citizen app primarily uses{" "}
          <span className="font-semibold text-civic-ink">local storage</span> for
          functional preferences. We do not currently set first-party analytics or ad
          cookies.
        </p>
      </section>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">On this device</h2>
        <p className="mt-4 text-sm leading-relaxed text-civic-slate">
          These keys are written by UrbanMesh in your browser. Clearing site data for
          this origin removes them.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-civic-line text-xs font-semibold uppercase tracking-[0.05em] text-civic-muted">
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Purpose</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_ROWS.map((row) => (
                <tr key={row.name} className="border-b border-civic-line/80 align-top">
                  <td className="py-3 pr-3 font-mono text-xs text-civic-ink">{row.name}</td>
                  <td className="py-3 pr-3 text-civic-slate">{row.purpose}</td>
                  <td className="py-3 pr-3 text-civic-slate">{row.type}</td>
                  <td className="py-3 text-civic-slate">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">Offline</h2>
        <p className="mt-4 text-sm leading-relaxed text-civic-slate">
          Where supported, UrbanMesh registers a service worker so the app shell and
          recently loaded map or report data can remain available if the network drops.
          Cached files stay on this device until the browser or you clear them. New
          reports still need a connection to reach the API.
        </p>
      </section>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">Location & reports</h2>
        <p className="mt-4 text-sm leading-relaxed text-civic-slate">
          If you allow location access, the browser shares your approximate coordinates
          with UrbanMesh so you can pin a hazard. That is a permission, not a cookie.
          Submitted reports (category, description, coordinates, optional photo) are
          stored on UrbanMesh servers for the Kilimani pilot map, corroboration, and
          planner-facing evidence. UrbanMesh does not create a public resident profile
          from “My reports.”
        </p>
      </section>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">Third parties</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-civic-slate">
          <li>
            <span className="font-semibold text-civic-ink">Map tiles</span> — vector
            basemaps are loaded from OpenFreeMap (OpenStreetMap data). Those providers may
            receive your IP address and standard request headers when tiles load.
          </li>
          <li>
            <span className="font-semibold text-civic-ink">Hosting / delivery</span> —
            the app and API may be served through normal web hosting infrastructure that
            logs technical access data for reliability and security.
          </li>
          <li>
            We do <span className="font-semibold text-civic-ink">not</span> embed social
            pixels, ad networks, or third-party behavioural analytics in the citizen app
            today.
          </li>
        </ul>
      </section>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">Your choices</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-civic-slate">
          <li>
            Clear UrbanMesh site data in your browser settings to remove local storage
            keys and cached files listed above.
          </li>
          <li>
            Revoke location permission in the browser or OS settings at any time.
          </li>
          <li>
            Uninstall the home-screen / PWA shortcut if you added one; that does not by
            itself delete server-side reports already submitted.
          </li>
          <li>
            Theme, “My reports,” resolved marks, and notice read-state only work while
            that storage remains on this device.
          </li>
        </ul>
      </section>

      <section className="mt-10 border-t border-civic-line pt-8">
        <h2 className="um-about-section-title">Contact</h2>
        <p className="mt-4 text-sm leading-relaxed text-civic-slate">
          Questions about this policy for the UrbanMesh Kilimani pilot should go through your
          pilot programme contact or county partner channel. This page is product
          documentation for the pilot — not legal advice, and not a county privacy notice.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/about" variant="secondary" className="min-h-11 rounded-full px-4">
          About UrbanMesh
        </ButtonLink>
        <ButtonLink to="/" className="min-h-11 rounded-full px-4">
          Back to map
        </ButtonLink>
      </div>

      <footer className="mt-12 border-t border-civic-line pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <UrbanMeshLogo />
          <nav
            aria-label="Policy links"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-civic-slate"
          >
            <Link to="/about" className="hover:text-civic-ink">
              About
            </Link>
            <Link to="/cookies" className="text-civic-ink">
              Cookies
            </Link>
            <Link to="/reports" className="hover:text-civic-ink">
              Reports
            </Link>
          </nav>
        </div>
      </footer>
    </article>
  );
}
