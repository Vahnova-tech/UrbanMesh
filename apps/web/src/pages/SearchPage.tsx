import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { NAV_PILL_OFFSET } from "../components/layout/AppShell";
import {
  searchCatalogue,
  type CatalogueSearchHit,
} from "../lib/api";
import { useNeighbourhood } from "../lib/neighbourhood";

export function SearchPage() {
  const { id } = useNeighbourhood();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "kilimani" | "kileleshwa">("all");
  const [results, setResults] = useState<CatalogueSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setScope(id);
  }, [id]);

  async function runSearch(query: string) {
    const needle = query.trim();
    if (needle.length < 2) {
      setResults([]);
      setSearched(false);
      setError(needle.length === 1 ? "Enter at least 2 characters." : null);
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await searchCatalogue({
        q: needle,
        neighbourhood: scope === "all" ? undefined : scope,
      });
      setResults(data.results);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) return;
    const timer = window.setTimeout(() => {
      void runSearch(needle);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, scope]);

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    void runSearch(q);
  }

  return (
    <div className={`um-scroll h-full ${NAV_PILL_OFFSET}`}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 lg:px-6 lg:pt-8">
        <p className="um-eyebrow">Catalogue</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-civic-ink">
          Search
        </h1>
        <p className="mt-2 text-sm text-civic-slate">
          Find datasets, concerns, layers, and planning documents across UrbanMesh.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search catalogue…"
            className="min-h-11 flex-1 rounded-card border border-civic-line bg-civic-surface px-3 text-sm outline-none focus:border-civic-accent"
            autoFocus
          />
          <select
            value={scope}
            onChange={(e) =>
              setScope(e.target.value as "all" | "kilimani" | "kileleshwa")
            }
            className="min-h-11 rounded-card border border-civic-line bg-civic-surface px-2 text-xs font-semibold"
          >
            <option value="all">All areas</option>
            <option value="kileleshwa">Kileleshwa</option>
            <option value="kilimani">Kilimani</option>
          </select>
          <button
            type="submit"
            className="min-h-11 rounded-card bg-civic-accent px-4 text-sm font-semibold text-white"
          >
            Search
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-civic-muted">Searching…</p>
        ) : null}

        {!loading && searched && results.length === 0 ? (
          <p className="mt-6 text-sm text-civic-muted">No matches.</p>
        ) : null}

        <ul className="mt-6 space-y-2">
          {results.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <Link
                to={hit.href}
                className="block rounded-card border border-civic-line bg-civic-surface px-4 py-3 transition-colors hover:bg-civic-mist/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-civic-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
                    {hit.kind.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
                    {hit.neighbourhood_id}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-civic-ink">
                  {hit.title}
                </p>
                {hit.subtitle ? (
                  <p className="mt-0.5 text-xs text-civic-slate">{hit.subtitle}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
