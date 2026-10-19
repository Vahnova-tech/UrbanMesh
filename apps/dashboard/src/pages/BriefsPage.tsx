import { useState } from "react";
import { generateLpdpBrief, LPDP_DOWNLOAD_HREF } from "../lib/api";
import { MONTH_LABEL } from "../lib/format";
import { ErrorNotice } from "../components/ui/Primitives";

export function BriefsPage() {
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateLpdpBrief();
      setCount(result.cluster_count);
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't compile the LPDP brief. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-5 lg:p-8">
      <h1 className="um-display">Policy briefs</h1>
      <p className="um-body mt-2 max-w-xl">
        One-click A4 planning brief from{" "}
        <span className="font-medium text-civic-ink">community-supported</span> Kilimani
        clusters (≥3 same-category reports within 15 m). This is spatial corroboration
        for the planning desk, not a statutory LPDP. Latest file: {MONTH_LABEL}.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={generating}
          className="min-h-10 rounded-card bg-civic-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-civic-accentDark disabled:pointer-events-none disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate LPDP Brief"}
        </button>
        <a
          href={LPDP_DOWNLOAD_HREF}
          className="inline-flex min-h-10 items-center rounded-card border border-civic-line px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-civic-mist"
        >
          Download policy brief
        </a>
      </div>

      {count !== null ? (
        <p className="mt-3 text-sm text-civic-accentDark">
          {count} community-supported clusters written to the brief.
        </p>
      ) : null}
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} onRetry={() => void onGenerate()} />
        </div>
      ) : null}

      {ready ? (
        <iframe
          title="Latest LPDP brief"
          src={LPDP_DOWNLOAD_HREF}
          className="mt-6 h-[640px] w-full rounded-card border border-civic-line bg-civic-mist"
        />
      ) : (
        <p className="mt-8 text-sm text-civic-muted">
          Generate a brief to preview the current community-supported evidence pack.
        </p>
      )}
    </div>
  );
}
