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
    <div className="p-5 lg:p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Policy briefs</h1>
      <p className="mt-1 max-w-xl text-sm text-civic-muted">
        One-click A4 LPDP brief from{" "}
        <span className="font-medium text-civic-ink">self-verified</span> Kilimani
        clusters (≥3 same-category reports within 15 m) for the county planning
        desk. Latest file: {MONTH_LABEL}.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={generating}
          className="rounded-card bg-civic-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          {generating ? "Generating…" : "Generate LPDP Brief"}
        </button>
        <a
          href={LPDP_DOWNLOAD_HREF}
          className="rounded-card border border-civic-line px-4 py-2.5 text-sm font-semibold"
        >
          Download policy brief
        </a>
      </div>

      {count !== null ? (
        <p className="mt-3 text-sm text-civic-accentDark">
          {count} verified clusters written to the brief.
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
          Generate a brief to preview the current verified-cluster evidence pack.
        </p>
      )}
    </div>
  );
}
