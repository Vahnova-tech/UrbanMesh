import { Link } from "react-router-dom";
import { ButtonLink } from "../components/ui/Button";
import { NAV_PILL_OFFSET } from "../components/layout/AppShell";
import { useNeighbourhood, type NeighbourhoodId } from "../lib/neighbourhood";

export function NeighbourhoodsPage() {
  const { id, neighbourhoods, setNeighbourhood } = useNeighbourhood();

  return (
    <div className={`um-scroll h-full ${NAV_PILL_OFFSET}`}>
      <div className="mx-auto max-w-[900px] px-4 pb-24 pt-4 lg:px-6 lg:pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-civic-ink">
          Areas
        </h1>

        <ul className="mt-8 space-y-4">
          {neighbourhoods.map((n) => {
            const active = n.id === id;
            return (
              <li
                key={n.id}
                className={`rounded-card border px-4 py-4 ${
                  active
                    ? "border-civic-accent bg-civic-verifiedBg/40"
                    : "border-civic-line bg-civic-surface"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-civic-ink">
                      {n.display_name}
                    </h2>
                    <p className="mt-1 text-sm text-civic-muted">
                      {n.reporting_mode === "infrastructure_hazards"
                        ? "Hazard reports"
                        : "Planning evidence"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setNeighbourhood(n.id as NeighbourhoodId)}
                      className="min-h-10 rounded-full border border-civic-line px-3 text-xs font-semibold hover:bg-civic-mist"
                    >
                      {active ? "Active" : "Switch here"}
                    </button>
                    {n.id === "kileleshwa" ? (
                      <ButtonLink
                        to="/kileleshwa"
                        className="min-h-10 rounded-full px-3 text-xs"
                      >
                        Open
                      </ButtonLink>
                    ) : (
                      <ButtonLink to="/" className="min-h-10 rounded-full px-3 text-xs">
                        Open map
                      </ButtonLink>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-xs text-civic-muted">
          Empty areas are not proof nothing is wrong.{" "}
          <Link to="/about" className="font-semibold text-civic-accent hover:underline">
            About
          </Link>
        </p>
      </div>
    </div>
  );
}
