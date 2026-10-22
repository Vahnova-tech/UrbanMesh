/**
 * First-class planning neighbourhoods. Kilimani and Kileleshwa are separate
 * geographic products — do not treat them as one dataset.
 *
 * Boundaries below are provisional MVP boxes for map framing until authoritative
 * ward polygons (e.g. IEBC / county GIS) are ingested. They are NOT official
 * cadastral boundaries.
 */

export type NeighbourhoodId = "kilimani" | "kileleshwa";

export interface NeighbourhoodConfig {
  id: NeighbourhoodId;
  display_name: string;
  short_label: string;
  /** Map camera center [lat, lng] */
  center: [number, number];
  /** Approximate framing bbox [minLat, maxLat, minLng, maxLng] — provisional */
  bbox: [number, number, number, number];
  boundary_status: "provisional_mvp" | "authoritative";
  boundary_source: string;
  boundary_note: string;
  reporting_mode: "infrastructure_hazards" | "community_planning";
  description: string;
}

export const NEIGHBOURHOODS: Record<NeighbourhoodId, NeighbourhoodConfig> = {
  kilimani: {
    id: "kilimani",
    display_name: "Kilimani",
    short_label: "Kilimani",
    center: [-1.2921, 36.785],
    bbox: [-1.32, -1.27, 36.76, 36.81],
    boundary_status: "provisional_mvp",
    boundary_source: "UrbanMesh MVP framing boxes (not IEBC polygons)",
    boundary_note:
      "Pilot corridors and ward boxes used for Kilimani hazard reporting. Replace with authoritative polygons before publishing boundary-derived area statistics.",
    reporting_mode: "infrastructure_hazards",
    description:
      "Community infrastructure hazard reporting with spatial corroboration for LPDP evidence.",
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
      "Provisional framing only. Neighbourhood name and administrative ward are not interchangeable until an authoritative boundary is validated.",
    reporting_mode: "community_planning",
    description:
      "Community-led planning data pack: neighbourhood evidence, development patterns, and service-delivery concerns.",
  },
};

export function isNeighbourhoodId(value: unknown): value is NeighbourhoodId {
  return value === "kilimani" || value === "kileleshwa";
}

export function neighbourhoodOrDefault(
  value: unknown,
): NeighbourhoodConfig {
  if (isNeighbourhoodId(value)) return NEIGHBOURHOODS[value];
  return NEIGHBOURHOODS.kilimani;
}

export function listNeighbourhoods(): NeighbourhoodConfig[] {
  return [NEIGHBOURHOODS.kilimani, NEIGHBOURHOODS.kileleshwa];
}

export function pointInBbox(
  lat: number,
  lng: number,
  bbox: [number, number, number, number],
): boolean {
  const [minLat, maxLat, minLng, maxLng] = bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}
