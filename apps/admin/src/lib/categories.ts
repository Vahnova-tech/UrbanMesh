export const HAZARD_CATEGORIES = [
  { id: "MOBILITY_SURFACE_DAMAGE", label: "Road surface damage" },
  { id: "NMT_PEDESTRIAN_HAZARD", label: "Pedestrian obstruction" },
  { id: "DRAINAGE_STORMWATER", label: "Drainage and stormwater" },
  { id: "SEWER_SANITATION", label: "Sewer and sanitation" },
  { id: "LIGHTING_SECURITY", label: "Lighting problems" },
  { id: "ILLEGAL_WASTE_DUMP", label: "Illegal waste dumping" },
] as const;

export type HazardCategoryId = (typeof HAZARD_CATEGORIES)[number]["id"];
