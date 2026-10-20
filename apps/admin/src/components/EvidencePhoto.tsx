import { useEffect, useId, useState } from "react";
import { photoPath, photoSrc } from "../lib/api";

export function EvidencePhoto({
  url,
  className = "max-h-72 w-full rounded-card border border-civic-line object-cover",
}: {
  url: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const src = failed ? null : photoSrc(url);
  const path = photoPath(url);

  useEffect(() => {
    setFailed(false);
    setOpen(false);
  }, [url]);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!url) {
    return (
      <p className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center text-sm text-civic-muted">
        No photo attached
      </p>
    );
  }

  if (!src) {
    return (
      <div className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center">
        <p className="text-sm text-civic-muted">Photo URL is not a valid UrbanMesh upload path.</p>
        <p className="mt-1 break-all font-mono text-[11px] text-civic-muted">{url}</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center">
        <p className="text-sm font-medium text-civic-slate">
          Photo unavailable
        </p>
        <p className="mt-1 text-xs text-civic-muted">
          File missing on API storage (common after a deploy without a persistent
          disk). Path below still comes from the report record.
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-civic-muted">
          {path}
        </p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-semibold text-civic-accent hover:underline"
        >
          Open URL directly
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-card text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-civic-accent"
        aria-label="View evidence photo larger"
      >
        <img
          src={src}
          alt="Report evidence"
          className={`${className} transition-opacity group-hover:opacity-95`}
          onError={() => setFailed(true)}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-civic-ink/70 px-2 py-1 text-[10px] font-semibold text-white">
          Click to enlarge
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="sr-only">
              Evidence photo
            </h2>
            <img
              src={src}
              alt="Report evidence enlarged"
              className="max-h-[85vh] w-auto max-w-full rounded-card object-contain"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="break-all font-mono text-[11px] text-white/70">
                {path}
              </p>
              <div className="flex gap-2">
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-9 rounded-card border border-white/30 px-3 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Open in tab
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-9 rounded-card bg-white px-3 text-xs font-semibold text-civic-ink"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
