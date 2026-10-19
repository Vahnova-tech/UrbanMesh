import type { IncidentPublic } from "./api";

export interface SearchHit {
  id: string;
  name: string;
  hint: string;
  lat: number;
  lng: number;
  kind: "place" | "report";
  reportId?: string;
}

/** Named Kilimani streets and landmarks for the map search box. */
export const KILIMANI_PLACES: SearchHit[] = [
  { id: "kilimani", name: "Kilimani", hint: "Planning area", lat: -1.2921, lng: 36.785, kind: "place" },
  { id: "kilimani-central", name: "Kilimani Central", hint: "Ward box", lat: -1.2935, lng: 36.784, kind: "place" },
  { id: "argwings", name: "Argwings Kodhek Road", hint: "Pilot corridor", lat: -1.2945, lng: 36.7885, kind: "place" },
  { id: "dennis-pritt", name: "Dennis Pritt Road", hint: "Pedestrian corridor", lat: -1.2934, lng: 36.7886, kind: "place" },
  { id: "ngong", name: "Ngong Road", hint: "Carriageway", lat: -1.299, lng: 36.788, kind: "place" },
  { id: "kirichwa", name: "Kirichwa Kubwa", hint: "Drainage / sanitation", lat: -1.2948, lng: 36.7814, kind: "place" },
  { id: "yaya", name: "Yaya Centre", hint: "Landmark", lat: -1.2928, lng: 36.7882, kind: "place" },
  { id: "yaya-ward", name: "Yaya / Argwings Kodhek", hint: "Ward box", lat: -1.297, lng: 36.775, kind: "place" },
  { id: "lenana", name: "Lenana Road", hint: "Kilimani street", lat: -1.2915, lng: 36.7825, kind: "place" },
  { id: "rose", name: "Rose Avenue", hint: "Kilimani street", lat: -1.2938, lng: 36.7865, kind: "place" },
  { id: "galana", name: "Galana Road", hint: "Kilimani street", lat: -1.291, lng: 36.7875, kind: "place" },
  { id: "wood-ave", name: "Wood Avenue", hint: "Kilimani street", lat: -1.2905, lng: 36.7855, kind: "place" },
  { id: "kindaruma", name: "Kindaruma Road", hint: "Kilimani street", lat: -1.2955, lng: 36.7868, kind: "place" },
  { id: "padmore", name: "George Padmore Road", hint: "Kilimani street", lat: -1.2898, lng: 36.7835, kind: "place" },
  { id: "elgeyo", name: "Elgeyo Marakwet Road", hint: "Kilimani street", lat: -1.2885, lng: 36.786, kind: "place" },
  { id: "garvey", name: "Marcus Garvey Road", hint: "Kilimani street", lat: -1.29, lng: 36.781, kind: "place" },
  { id: "chaka", name: "Chaka Road", hint: "Kilimani street", lat: -1.292, lng: 36.7905, kind: "place" },
  { id: "ring-road", name: "Ring Road Kilimani", hint: "Kilimani street", lat: -1.2975, lng: 36.786, kind: "place" },
  { id: "riara", name: "Riara Road", hint: "Kilimani street", lat: -1.3015, lng: 36.7755, kind: "place" },
  { id: "hurlingham", name: "Hurlingham", hint: "Neighbourhood", lat: -1.2885, lng: 36.798, kind: "place" },
  { id: "woodley", name: "Woodley / Ngong Road", hint: "Ward box", lat: -1.304, lng: 36.7835, kind: "place" },
  { id: "statehouse", name: "State House Area", hint: "Ward box", lat: -1.284, lng: 36.7975, kind: "place" },
  { id: "kileleshwa", name: "Kileleshwa Edge", hint: "Ward box", lat: -1.286, lng: 36.7765, kind: "place" },
  { id: "adlife", name: "Adlife Plaza", hint: "Landmark", lat: -1.2935, lng: 36.787, kind: "place" },
  { id: "prestige", name: "Prestige Plaza", hint: "Landmark", lat: -1.3005, lng: 36.7805, kind: "place" },
  { id: "valley-arcade", name: "Valley Arcade", hint: "Landmark", lat: -1.3, lng: 36.776, kind: "place" },
];

const VIEWBOX = {
  minLat: -1.315,
  maxLat: -1.275,
  minLng: 36.765,
  maxLng: 36.808,
};

function matchesNeedle(text: string, needle: string): boolean {
  const hay = text.toLowerCase();
  if (hay.includes(needle)) return true;
  const compact = hay.replace(/[^a-z0-9]+/g, "");
  const compactNeedle = needle.replace(/[^a-z0-9]+/g, "");
  return compactNeedle.length >= 2 && compact.includes(compactNeedle);
}

export function searchKilimaniPlaces(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return [];
  return KILIMANI_PLACES.filter(
    (place) => matchesNeedle(place.name, needle) || matchesNeedle(place.hint, needle),
  ).slice(0, 8);
}

export function searchIncidents(
  query: string,
  incidents: IncidentPublic[],
): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const item of incidents) {
    const blob = [
      item.category_label,
      item.corridor,
      item.ward_name,
      item.description,
    ]
      .join(" ")
      .toLowerCase();
    if (!blob.includes(needle) && !matchesNeedle(item.corridor, needle)) continue;
    hits.push({
      id: `report-${item.id}`,
      name: item.category_label,
      hint: `${item.corridor} · ${item.is_verified ? "Community-supported" : "Pending"}`,
      lat: item.lat,
      lng: item.lng,
      kind: "report",
      reportId: item.id,
    });
    if (hits.length >= 5) break;
  }
  return hits;
}

function inKilimani(lat: number, lng: number): boolean {
  return (
    lat >= VIEWBOX.minLat &&
    lat <= VIEWBOX.maxLat &&
    lng >= VIEWBOX.minLng &&
    lng <= VIEWBOX.maxLng
  );
}

type NominatimHit = {
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  type?: string;
};

export async function geocodeKilimani(
  query: string,
  signal?: AbortSignal,
): Promise<SearchHit[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];
  const params = new URLSearchParams({
    q: `${needle}, Kilimani, Nairobi`,
    format: "jsonv2",
    addressdetails: "0",
    limit: "5",
    countrycodes: "ke",
    viewbox: `${VIEWBOX.minLng},${VIEWBOX.maxLat},${VIEWBOX.maxLng},${VIEWBOX.minLat}`,
    bounded: "1",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as NominatimHit[];
  const hits: SearchHit[] = [];
  for (const row of rows) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inKilimani(lat, lng)) {
      continue;
    }
    const name = (row.name || row.display_name || needle).split(",")[0]?.trim();
    if (!name) continue;
    hits.push({
      id: `osm-${lat.toFixed(5)}-${lng.toFixed(5)}`,
      name,
      hint: "Kilimani street",
      lat,
      lng,
      kind: "place",
    });
  }
  return hits;
}

export function mergeSearchHits(...groups: SearchHit[][]): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const group of groups) {
    for (const hit of group) {
      const key = `${hit.kind}:${hit.name.toLowerCase()}:${hit.lat.toFixed(4)}:${hit.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
      if (out.length >= 12) return out;
    }
  }
  return out;
}
