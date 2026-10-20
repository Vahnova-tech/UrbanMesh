import { useEffect, useMemo, useState } from "react";
import type { IncidentPublic } from "./api";
import {
  collapseRedundantReports,
  type CollapsedReport,
} from "./collapseReports";
import { isGroupResolved } from "./resolvedReports";

/** Subscribe to device-local resolved marks so collapsed lists re-filter. */
export function useResolvedTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    function sync() {
      setTick((n) => n + 1);
    }
    window.addEventListener("urbanmesh:resolved-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("urbanmesh:resolved-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return tick;
}

type StatusFilter = "all" | "verified" | "pending";

/**
 * Collapse same-category / cluster duplicates, optionally hide device-resolved groups.
 */
export function useCollapsedReports(
  incidents: IncidentPublic[],
  options: {
    hideResolved?: boolean;
    category?: string;
    status?: StatusFilter;
  } = {},
): CollapsedReport[] {
  const {
    hideResolved = false,
    category = "all",
    status = "all",
  } = options;
  const resolvedTick = useResolvedTick();

  return useMemo(() => {
    const matched = incidents.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (status === "verified" && !item.is_verified) return false;
      if (status === "pending" && item.is_verified) return false;
      return true;
    });
    let rows = collapseRedundantReports(matched);
    if (hideResolved) {
      rows = rows.filter((row) => !isGroupResolved(row.member_ids));
    }
    return rows;
  }, [incidents, hideResolved, category, status, resolvedTick]);
}
