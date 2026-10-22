import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../components/ui/Button";
import { UrbanMeshLogo } from "../components/ui/UrbanMeshLogo";

const APPROACH = [
  {
    title: "Resident report",
    body: "A Kilimani resident pins a tangible street hazard they can see — one of six scoped categories.",
  },
  {
    title: "Nearby corroboration",
    body: "Same-category reports nearby count as corroboration, not likes or votes.",
  },
  {
    title: "Community-supported cluster",
    body: "Three or more reports within 15 metres form a shared, community-supported cluster.",
  },
  {
    title: "Planning evidence",
    body: "Only those clusters feed the walkability heatmap and LPDP planning export — not a statutory plan.",
  },
] as const;

const CAPABILITIES = [
  {
    title: "Street hazard reporting",
    body: "Mobile-first capture of geotagged mobility and infrastructure hazards on Kilimani corridors.",
  },
  {
    title: "Spatial corroboration",
    body: "Automatic clustering when ≥3 same-category reports land within 15 metres — a priority signal, not a county inspection.",
  },
  {
    title: "Planner-facing evidence",
    body: "Community-supported clusters compile into walkability intelligence and LPDP policy-brief input for Nairobi City County workflows.",
  },
] as const;

const DIFFERENCE = [
  {
    title: "Self-verifying, not open inbox",
    body: "Trust is programmatic: heatmap and LPDP entries require spatial corroboration, so unverified single reports stay pending.",
  },
  {
    title: "Scoped to street hazards",
    body: "Six tangible point-hazard types only. No crime logs, water-rationing schedules, or public citizen profiles.",
  },
  {
    title: "Built for Nairobi bandwidth",
    body: "Progressive Web App with a lightweight shell and deferred map code so reporting still works on slower mobile networks.",
  },
  {
    title: "Privacy by design",
    body: "No public profile on this phone. “My Reports” stays on-device. Sensitive social domains stay out of scope.",
  },
] as const;

export function AboutPage() {
  return (
    <article className="um-about um-enter bg-civic-paper text-civic-ink">
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-[max(7.5rem,calc(6rem+env(safe-area-inset-bottom)))] pt-8 md:pb-12 lg:px-6 lg:pt-14">
        {/* 01 — Hero */}
        <header className="grid gap-10 border-b border-civic-line pb-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16 lg:pb-20">
          <div>
            <h1 className="um-about-hero-title um-about-stagger max-w-[12ch] text-balance">
              Street evidence.
            </h1>
            <p
              className="um-about-stagger mt-4 max-w-md text-sm leading-relaxed text-civic-slate"
              style={{ animationDelay: "120ms" }}
            >
              Residents document street hazards. Nearby agreement becomes planning input.
            </p>
            <div
              className="um-about-stagger mt-8 flex flex-wrap items-center gap-x-5 gap-y-3"
              style={{ animationDelay: "180ms" }}
            >
              <a
                href="#approach"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-civic-accent"
              >
                Approach
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none"
                >
                  ↘
                </span>
              </a>
              <ButtonLink to="/reports/new" className="min-h-11 rounded-full px-4 text-sm">
                Report a hazard
              </ButtonLink>
            </div>
          </div>

          <aside
            className="um-about-stagger relative border border-civic-line bg-civic-surface px-5 py-6 lg:px-6 lg:py-8"
            style={{ animationDelay: "220ms" }}
            aria-label="Pilot context"
          >
            <dl className="space-y-5">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-civic-muted">
                  Place
                </dt>
                <dd className="mt-1 text-sm font-semibold text-civic-ink">
                  Kilimani · Nairobi City County
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-civic-muted">
                  Scale
                </dt>
                <dd className="mt-1 text-sm font-semibold text-civic-ink">
                  ~50,457 residents · 16.1 km²
                </dd>
                <dd className="mt-0.5 text-xs text-civic-muted">2019 census context</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-civic-muted">
                  Corridors
                </dt>
                <dd className="mt-1 text-sm font-semibold leading-snug text-civic-ink">
                  Argwings Kodhek Road · Kirichwa Kubwa
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-civic-muted">
                  Corroboration rule
                </dt>
                <dd className="mt-1 text-sm font-semibold text-civic-ink">
                  ≥3 same-category reports within 15 m
                </dd>
              </div>
            </dl>
          </aside>
        </header>

        {/* 02 — Our story */}
        <Reveal as="section" className="border-b border-civic-line py-10 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:gap-16">
            <h2 className="um-about-section-title max-w-[12ch]">Why it exists</h2>
            <p className="max-w-xl text-sm leading-relaxed text-civic-slate">
              A single complaint rarely carries enough weight. When enough people report the
              same hazard in the same place, UrbanMesh forms a community-supported cluster
              for planning input.
            </p>
          </div>
        </Reveal>

        {/* 03–04 — Mission & Vision */}
        <Reveal as="section" className="border-b border-civic-line py-10 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="um-about-section-title">Purpose</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-civic-slate">
                A clear way to document street hazards, and corroborated evidence planners can
                use. Community agreement is not an official inspection.
              </p>
            </div>
            <div>
              <h2 className="um-about-section-title">Direction</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-civic-slate">
                Stay honest about what is live, what is pending, and what still needs county
                confirmation.
              </p>
            </div>
          </div>
        </Reveal>

        {/* 05 — What we do */}
        <Reveal as="section" className="border-b border-civic-line py-10 lg:py-14">
          <h2 className="um-about-section-title">What it does</h2>
          <ul className="mt-10 divide-y divide-civic-line border-y border-civic-line">
            {CAPABILITIES.map((item, index) => (
              <li key={item.title}>
                <Link
                  to={index === 0 ? "/reports/new" : index === 1 ? "/reports" : "/"}
                  className="group flex flex-col gap-2 py-6 transition-colors hover:bg-civic-mist/40 sm:flex-row sm:items-baseline sm:gap-8 motion-reduce:transition-none"
                >
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-civic-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-lg font-semibold tracking-tight text-civic-ink">
                        {item.title}
                      </span>
                      <span
                        aria-hidden
                        className="text-sm font-semibold text-civic-accent opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none"
                      >
                        →
                      </span>
                    </span>
                    <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-civic-slate">
                      {item.body}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* 06 — Our approach */}
        <Reveal
          as="section"
          id="approach"
          className="scroll-mt-24 border-b border-civic-line py-10 lg:py-14"
        >
          <h2 className="um-about-section-title">How a report becomes evidence</h2>

          <ol className="mt-10 grid gap-0 lg:grid-cols-4 lg:gap-0">
            {APPROACH.map((step, index) => (
              <li
                key={step.title}
                className="relative border-t border-civic-line py-6 lg:border-t-0 lg:border-l lg:px-5 lg:py-0 lg:first:border-l-0 lg:first:pl-0"
              >
                <p className="text-xs font-semibold tabular-nums text-civic-muted">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-base font-semibold tracking-tight text-civic-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-civic-slate">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-8 border-t border-civic-line pt-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="text-sm font-semibold text-civic-ink">What you will see on the map</h3>
              <ul className="mt-4 space-y-4 text-sm leading-relaxed text-civic-slate">
                <li>
                  <span className="font-semibold text-civic-pending">Pending</span> — an
                  individual report still waiting for nearby same-category corroboration.
                </li>
                <li>
                  <span className="font-semibold text-civic-verified">Community-supported</span>{" "}
                  — three or more same-category reports within 15 metres. Spatial
                  corroboration, not a field inspection.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-civic-ink">Statuses that are not live yet</h3>
              <ul className="mt-4 space-y-4 text-sm leading-relaxed text-civic-slate">
                <li>
                  <span className="font-semibold text-civic-ink">Field-verified</span> — a
                  county or partner inspector would confirm the site in person. UrbanMesh does
                  not collect that status today.
                </li>
                <li>
                  <span className="font-semibold text-civic-ink">Resolved</span> — works
                  completed or the hazard removed. There is no official resolution workflow yet;
                  device-local “resolved” marks are personal only.
                </li>
              </ul>
            </div>
          </div>
        </Reveal>

        {/* 07 — Our difference */}
        <Reveal as="section" className="border-b border-civic-line py-10 lg:py-14">
          <h2 className="um-about-section-title">How it differs</h2>
          <ul className="mt-10 grid gap-10 sm:grid-cols-2">
            {DIFFERENCE.map((item) => (
              <li key={item.title} className="max-w-md">
                <h3 className="text-base font-semibold tracking-tight text-civic-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-civic-slate">{item.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="section" className="border-b border-civic-line py-10 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:gap-16">
            <h2 className="um-about-section-title">Install</h2>
            <p className="max-w-xl text-sm leading-relaxed text-civic-slate">
              Use the header install control, or Share → Add to Home Screen on iPhone.
              Cached pages stay available offline. New reports still need a connection.
            </p>
          </div>
        </Reveal>

        {/* Closing CTA */}
        <Reveal as="section" className="py-10 lg:py-14">
          <h2 className="um-about-section-title max-w-[14ch]">See a hazard?</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/reports/new" className="min-h-12 rounded-full px-5">
              Report a hazard
            </ButtonLink>
            <ButtonLink to="/" variant="secondary" className="min-h-12 rounded-full px-5">
              Open the map
            </ButtonLink>
          </div>
        </Reveal>

        {/* Compact page footer */}
        <footer className="border-t border-civic-line pt-8 pb-2">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <UrbanMeshLogo />
              <p className="um-meta mt-2 max-w-sm">
                Crowdsourced walkability intelligence for Kilimani — planning input, not a
                statutory plan.
              </p>
            </div>
            <nav
              aria-label="About page links"
              className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-civic-slate"
            >
              <Link to="/" className="hover:text-civic-ink">
                Map
              </Link>
              <Link to="/reports" className="hover:text-civic-ink">
                Reports
              </Link>
              <Link to="/reports/new" className="hover:text-civic-ink">
                Report
              </Link>
              <Link to="/me" className="hover:text-civic-ink">
                My reports
              </Link>
              <Link to="/cookies" className="hover:text-civic-ink">
                Cookies
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </article>
  );
}

function Reveal({
  children,
  className = "",
  as: Tag = "div",
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  id?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      id={id}
      ref={ref as never}
      className={`um-about-reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
