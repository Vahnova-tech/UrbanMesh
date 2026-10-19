export const HAZARD_LABELS: Record<string, string> = {
  MOBILITY_SURFACE_DAMAGE: "Road surface damage",
  NMT_PEDESTRIAN_HAZARD: "Pedestrian obstruction",
  DRAINAGE_STORMWATER: "Drainage and stormwater",
  SEWER_SANITATION: "Sewer and sanitation",
  LIGHTING_SECURITY: "Lighting problems",
  ILLEGAL_WASTE_DUMP: "Illegal waste dumping",
};

export const HAZARD_SEVERITY: Record<string, "critical" | "standard"> = {
  MOBILITY_SURFACE_DAMAGE: "standard",
  NMT_PEDESTRIAN_HAZARD: "standard",
  DRAINAGE_STORMWATER: "critical",
  SEWER_SANITATION: "critical",
  LIGHTING_SECURITY: "standard",
  ILLEGAL_WASTE_DUMP: "standard",
};

export function labelForCategory(category: string): string {
  return HAZARD_LABELS[category] ?? category;
}

export function severityForCategory(
  category: string,
): "critical" | "standard" {
  return HAZARD_SEVERITY[category] ?? "standard";
}
