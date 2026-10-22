import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const WALKTHROUGH_KEY = "urbanmesh.walkthrough";
export const WALKTHROUGH_DONE = "urbanmesh:walkthrough-done";

const STEPS = [
  {
    id: "area",
    title: "Area",
    body: "Kilimani and Kileleshwa stay separate.",
  },
  {
    id: "map",
    title: "Map",
    body: "Street hazards show up here.",
  },
  {
    id: "report",
    title: "Report",
    body: "Pin a hazard you can see.",
  },
  {
    id: "reports",
    title: "Reports",
    body: "Supported means 3 reports within 15 m.",
  },
] as const;

type Rect = { top: number; left: number; width: number; height: number };

function seen(): boolean {
  try {
    return localStorage.getItem(WALKTHROUGH_KEY) === "seen";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(WALKTHROUGH_KEY, "seen");
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(WALKTHROUGH_DONE));
}

function visibleTarget(id: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const el of nodes) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    return el;
  }
  return null;
}

function spotlight(rect: DOMRect): Rect {
  if (rect.height > window.innerHeight * 0.45) {
    const width = Math.min(200, Math.max(120, rect.width - 48));
    const height = 112;
    return {
      top: rect.top + Math.min(96, rect.height * 0.22),
      left: rect.left + (rect.width - width) / 2,
      width,
      height,
    };
  }
  const pad = 6;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

export function Walkthrough() {
  const { pathname } = useLocation();
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [hole, setHole] = useState<Rect | null>(null);

  useEffect(() => {
    if (pathname !== "/" || seen()) return;
    const frame = window.requestAnimationFrame(() => setActive(true));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    function measure() {
      const el = visibleTarget(STEPS[step].id);
      setHole(el ? spotlight(el.getBoundingClientRect()) : null);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  function finish() {
    markSeen();
    setActive(false);
  }

  function next() {
    if (last) finish();
    else setStep((n) => n + 1);
  }

  const cardWidth = Math.min(300, window.innerWidth - 24);
  let cardTop = 88;
  let cardLeft = 12;
  if (hole) {
    cardLeft = Math.min(Math.max(12, hole.left), window.innerWidth - cardWidth - 12);
    const below = hole.top + hole.height + 12;
    cardTop =
      below + 148 < window.innerHeight - 12
        ? below
        : Math.max(12, hole.top - 160);
  }

  return (
    <div className="fixed inset-0 z-[2400]" role="dialog" aria-modal="true" aria-labelledby="um-tour-title">
      {hole ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-civic-accent"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow: "0 0 0 9999px color-mix(in srgb, var(--civic-ink) 55%, transparent)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-civic-ink/55" />
      )}
      <div className="absolute inset-0" />
      <div
        className="absolute rounded-card border border-civic-line bg-civic-surface/90 p-4 shadow-card backdrop-blur-md"
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
      >
        <p className="text-[11px] font-semibold text-civic-muted">
          {step + 1} / {STEPS.length}
        </p>
        <h2 id="um-tour-title" className="mt-1 text-base font-semibold text-civic-ink">
          {current.title}
        </h2>
        <p className="mt-1 text-sm text-civic-slate">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="min-h-9 text-xs font-semibold text-civic-muted"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-9 items-center rounded-full bg-civic-accent px-4 text-xs font-semibold text-white"
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
