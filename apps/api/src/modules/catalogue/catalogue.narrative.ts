import type { NeighbourhoodId } from "../../lib/neighbourhoods.js";
import type { GlanceIndicator } from "./catalogue.types.js";

export const KILELESHWA_GLANCE: GlanceIndicator[] = [
  {
    id: "population",
    label: "Population",
    value: null,
    unit: "residents",
    status: "tbd",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Kileleshwa (scope TBD — ward vs neighbourhood)",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology:
      "Awaiting sourced census / KNBS figure for the chosen geographic unit.",
  },
  {
    id: "area",
    label: "Geographic area",
    value: null,
    unit: "km²",
    status: "tbd",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Authoritative ward boundary required",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology:
      "Calculate from validated PostGIS polygon once an official boundary is ingested. Provisional framing bbox must not be used for published area stats.",
  },
  {
    id: "density",
    label: "Population density",
    value: null,
    unit: "residents/km²",
    status: "tbd",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Requires population + area",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology: "Derived only when both population and area are source-backed.",
  },
  {
    id: "building_footprint",
    label: "Building footprint",
    value: null,
    unit: "m² or count",
    status: "unavailable",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Kileleshwa",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology: "Requires licensed or open building-footprint layer.",
  },
  {
    id: "green_open_space",
    label: "Green and open space",
    value: null,
    unit: "% or ha",
    status: "unavailable",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Kileleshwa",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology: "Map from sourced land-cover / open-space datasets when available.",
  },
  {
    id: "road_network",
    label: "Road network",
    value: null,
    unit: "km",
    status: "unavailable",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Kileleshwa",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology: "Sum lengths from OSM or county road centreline with attribution.",
  },
  {
    id: "watercourses",
    label: "Major watercourses",
    value: null,
    unit: null,
    status: "unavailable",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Kileleshwa",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology: "Map from hydrology layers when licensed/open data is acquired.",
  },
  {
    id: "public_facilities",
    label: "Public facilities",
    value: null,
    unit: "count",
    status: "unavailable",
    source_organization: null,
    reference_year: null,
    geographic_scope: "Kileleshwa",
    last_updated: null,
    confidence: "unknown",
    source_url: null,
    methodology: "Catalogue facilities with classification and source per feature.",
  },
];

export interface PackNarrative {
  subtitle: string;
  introduction: string;
  process_steps: string[];
  limitations: string[];
  privacy_guidance: string[];
  recommended_use: string[];
  glance: GlanceIndicator[];
}

export const PACK_NARRATIVE: Record<NeighbourhoodId, PackNarrative> = {
  kilimani: {
    subtitle: "Infrastructure reporting pilot",
    introduction:
      "Kilimani focuses on resident infrastructure hazard reports with spatial community corroboration for county planning input.",
    process_steps: [
      "Report a visible hazard",
      "Corroborate nearby",
      "Review evidence",
      "Field-verify when inspected",
      "Feed LPDP brief",
    ],
    limitations: [
      "Absence of reports is not proof an area has no hazards.",
      "Community-supported ≠ field-verified.",
    ],
    privacy_guidance: [
      "No public citizen profiles.",
      "Photos and locations follow pilot privacy rules.",
    ],
    recommended_use: [
      "Resident reporting",
      "Planner heatmap and cluster review",
      "LPDP evidence briefs",
    ],
    glance: [],
  },
  kileleshwa: {
    subtitle: "Kileleshwa Data Package",
    introduction:
      "This data pack helps residents, planners, researchers, and developers move from neighbourhood evidence to practical interventions: Understand → Investigate → Identify → Define → Design → Test. Statistics and map layers appear only when sourced. Missing values are marked TBD — never invented.",
    process_steps: [
      "Understand the neighbourhood context",
      "Investigate geographic and social evidence",
      "Identify a real, specific problem",
      "Define a problem statement",
      "Design a feasible intervention",
      "Test against local conditions",
    ],
    limitations: [
      "Ward name and neighbourhood extent may differ until an authoritative boundary is validated.",
      "No official population, area, or density figures are published here yet.",
      "Absence of concerns or datasets is not evidence that issues do not exist.",
      "Draft pack — not a statutory plan or county-endorsed assessment.",
    ],
    privacy_guidance: [
      "Do not publish names, phone numbers, national IDs, or exact residential addresses.",
      "Generalize precise coordinates when they could identify households.",
      "Restricted datasets require server-side authorization before download.",
      "Synthetic samples must never be presented as real community reports.",
    ],
    recommended_use: [
      "Open & Safe: public or anonymized layers under their licence",
      "Restricted: authorized partners only, audited access",
      "Sample / Synthetic: education and prototyping — labelled SYNTHETIC DATA",
    ],
    glance: KILELESHWA_GLANCE,
  },
};
