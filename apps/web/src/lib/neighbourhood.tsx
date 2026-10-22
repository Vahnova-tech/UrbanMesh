import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type NeighbourhoodId = "kilimani" | "kileleshwa";

export interface NeighbourhoodInfo {
  id: NeighbourhoodId;
  display_name: string;
  short_label: string;
  center: [number, number];
  bbox: [number, number, number, number];
  boundary_status: string;
  boundary_source: string;
  boundary_note: string;
  reporting_mode: "infrastructure_hazards" | "community_planning";
  description: string;
}

const STORAGE_KEY = "urbanmesh.neighbourhood";

const FALLBACK: Record<NeighbourhoodId, NeighbourhoodInfo> = {
  kilimani: {
    id: "kilimani",
    display_name: "Kilimani",
    short_label: "Kilimani",
    center: [-1.2921, 36.785],
    bbox: [-1.32, -1.27, 36.76, 36.81],
    boundary_status: "provisional_mvp",
    boundary_source: "UrbanMesh MVP framing boxes",
    boundary_note: "Provisional framing for hazard reporting.",
    reporting_mode: "infrastructure_hazards",
    description: "Infrastructure hazard reporting pilot.",
  },
  kileleshwa: {
    id: "kileleshwa",
    display_name: "Kileleshwa",
    short_label: "Kileleshwa",
    center: [-1.2835, 36.778],
    bbox: [-1.295, -1.272, 36.765, 36.792],
    boundary_status: "provisional_mvp",
    boundary_source: "UrbanMesh MVP framing box — pending authoritative ward boundary",
    boundary_note:
      "Provisional only. Ward and neighbourhood extents may differ until validated.",
    reporting_mode: "community_planning",
    description: "Community-led planning data pack.",
  },
};

interface NeighbourhoodValue {
  id: NeighbourhoodId;
  neighbourhood: NeighbourhoodInfo;
  setNeighbourhood: (id: NeighbourhoodId) => void;
  neighbourhoods: NeighbourhoodInfo[];
}

const Ctx = createContext<NeighbourhoodValue | null>(null);

function readStored(): NeighbourhoodId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "kilimani" || raw === "kileleshwa") return raw;
  } catch {
    /* ignore */
  }
  return "kilimani";
}

export function NeighbourhoodProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<NeighbourhoodId>(() => readStored());
  const [list, setList] = useState<NeighbourhoodInfo[]>([
    FALLBACK.kilimani,
    FALLBACK.kileleshwa,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent("urbanmesh:neighbourhood-change", { detail: id }),
    );
  }, [id]);

  useEffect(() => {
    const base = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
    void fetch(`${base}/api/v1/catalogue/neighbourhoods`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { neighbourhoods?: NeighbourhoodInfo[] } | null) => {
        if (data?.neighbourhoods?.length) setList(data.neighbourhoods);
      })
      .catch(() => undefined);
  }, []);

  const setNeighbourhood = useCallback((next: NeighbourhoodId) => {
    setId(next);
  }, []);

  const neighbourhood =
    list.find((n) => n.id === id) ?? FALLBACK[id] ?? FALLBACK.kilimani;

  const value = useMemo(
    () => ({
      id,
      neighbourhood,
      setNeighbourhood,
      neighbourhoods: list,
    }),
    [id, neighbourhood, setNeighbourhood, list],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNeighbourhood(): NeighbourhoodValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useNeighbourhood must be used within NeighbourhoodProvider");
  }
  return ctx;
}

export function NeighbourhoodSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { id, neighbourhoods, setNeighbourhood } = useNeighbourhood();
  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">Neighbourhood</span>
      <select
        value={id}
        onChange={(e) =>
          setNeighbourhood(e.target.value as NeighbourhoodId)
        }
        aria-label="Select neighbourhood"
        className="min-h-9 max-w-[9.5rem] rounded-full border border-civic-line bg-civic-surface px-2.5 text-xs font-semibold text-civic-ink outline-none focus:border-civic-accent"
      >
        {neighbourhoods.map((n) => (
          <option key={n.id} value={n.id}>
            {n.short_label}
          </option>
        ))}
      </select>
    </label>
  );
}
