export const HAZARD_OPTIONS = [
  {
    value: "MOBILITY_SURFACE_DAMAGE",
    label: "Road surface damage",
    hint: "Potholes, cracked asphalt, broken paving",
  },
  {
    value: "NMT_PEDESTRIAN_HAZARD",
    label: "Pedestrian obstruction",
    hint: "Blocked sidewalks and walkway barriers",
  },
  {
    value: "DRAINAGE_STORMWATER",
    label: "Drainage and stormwater",
    hint: "Clogged drains and standing water",
  },
  {
    value: "SEWER_SANITATION",
    label: "Sewer and sanitation",
    hint: "Open manholes and sewer leaks",
  },
  {
    value: "LIGHTING_SECURITY",
    label: "Lighting problems",
    hint: "Unlit streets and dead lamps",
  },
  {
    value: "ILLEGAL_WASTE_DUMP",
    label: "Illegal waste dumping",
    hint: "Waste piles blocking mobility paths",
  },
] as const;

export type HazardCategoryValue = (typeof HAZARD_OPTIONS)[number]["value"];

export function labelForCategory(value: string): string {
  return HAZARD_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
