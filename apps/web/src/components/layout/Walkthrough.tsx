import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const WALKTHROUGH_KEY = "urbanmesh.walkthrough";
export const WALKTHROUGH_DONE = "urbanmesh:walkthrough-done";

const STEPS = [
  {
    id: "area",
    title: "Choose an area",
    body: "Kilimani and Kileleshwa each have their own map.",
  },
  {
    id: "map",
    title: "Read the map",
    body: "Pins are hazards people reported nearby.",
  },
  {
    id: "report",
    title: "Add a report",
    body: "Pin a hazard you can see on the street.",
  },
  {
    id: "filters",
    title: "Filter the map",
    body: "Keep one hazard type, or only supported pins.",
  },
  {
    id: "reports",
    title: "Open the list",
    body: "Supported means 3 of the same hazard within 15 m.",
  },
] as const;

type Step = (typeof STEPS)[number];
type Rect = { top: number; left: number; width: number; height: number; radius: number };

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

function cardClearance(): number {
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  return narrow ? 300 : 200;
}

function spotlight(rect: DOMRect, id: string): Rect {
  if (id === "map") {
    const top = Math.max(rect.top + 8, 78);
    const bottom = window.innerHeight - cardClearance() - 16;
    return {
      top,
      left: Math.max(12, rect.left + 10),
      width: Math.max(120, Math.min(rect.right - 10, window.innerWidth - 12) - Math.max(12, rect.left + 10)),
      height: Math.max(96, bottom - top),
      radius: 18,
    };
  }
  const pad = 8;
  const height = rect.height + pad * 2;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height,
    radius: height < 72 ? 999 : 16,
  };
}

export function Walkthrough() {
  const { pathname } = useLocation();
  const [steps, setSteps] = useState<Step[]>([]);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [hole, setHole] = useState<Rect | null>(null);

  const finish = useCallback(() => {
    markSeen();
    setActive(false);
  }, []);

  useEffect(() => {
    if (pathname !== "/" || seen()) return;
    const frame = window.requestAnimationFrame(() => {
      const available = STEPS.filter((item) => visibleTarget(item.id));
      if (available.length === 0) return;
      setSteps(available);
      setStep(0);
      setActive(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!active || steps.length === 0) return;
    const current = steps[step];
    if (!current) return;
    function measure() {
      const el = visibleTarget(current.id);
      setHole(el ? spotlight(el.getBoundingClientRect(), current.id) : null);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, steps]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight") {
        setStep((n) => (n >= steps.length - 1 ? n : n + 1));
      }
      if (event.key === "ArrowLeft") setStep((n) => Math.max(0, n - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, steps.length]);

  if (!active || steps.length === 0) return null;

  const current = steps[step];
  const last = step === steps.length - 1;
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  return (
    <div className="fixed inset-0 z-[2400]" role="dialog" aria-modal="true" aria-labelledby="um-tour-title">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="um-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {hole ? (
              <rect
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={hole.radius}
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(12, 16, 14, 0.62)"
          mask="url(#um-tour-mask)"
        />
      </svg>
      {hole ? (
        <div
          aria-hidden
          className="pointer-events-none absolute ring-2 ring-civic-accent"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            borderRadius: hole.radius,
            boxShadow: "0 0 0 1px color-mix(in srgb, var(--civic-accent) 35%, transparent), 0 0 24px color-mix(in srgb, var(--civic-accent) 45%, transparent)",
          }}
        />
      ) : null}
      <div className="absolute inset-0" />
      <div
        className="absolute inset-x-3 z-[1] mx-auto max-w-sm"
        style={{
          bottom: narrow
            ? "max(8.25rem, calc(7.4rem + env(safe-area-inset-bottom)))"
            : "1.5rem",
        }}
      >
        <div className="rounded-card border border-civic-line bg-civic-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {steps.map((item, index) => (
                <span
                  key={item.id}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${
                    index === step ? "w-4 bg-civic-accent" : "w-1.5 bg-civic-line"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={finish}
              className="min-h-8 text-xs font-semibold text-civic-muted"
            >
              Skip
            </button>
          </div>
          <h2 id="um-tour-title" className="mt-3 text-base font-semibold text-civic-ink">
            {current.title}
          </h2>
          <p className="mt-1 text-sm leading-snug text-civic-slate">{current.body}</p>
          <div className="mt-4 flex items-center justify-end gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((n) => Math.max(0, n - 1))}
                className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold text-civic-slate"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (last) finish();
                else setStep((n) => n + 1);
              }}
              className="inline-flex min-h-9 items-center rounded-full bg-civic-accent px-4 text-xs font-semibold text-white"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
