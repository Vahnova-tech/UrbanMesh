import type { NeighbourhoodId } from "../../lib/neighbourhoods.js";

export type AccessTier = "open" | "restricted" | "synthetic";
export type DataKind = "real" | "derived" | "synthetic" | "reference";

export interface CatalogueDataset {
  id: string;
  neighbourhood_id: NeighbourhoodId;
  slug: string;
  title: string;
  description: string;
  category: string;
  geographic_coverage: string;
  source_organization: string;
  source_url: string | null;
  published_at: string | null;
  acquired_at: string | null;
  observation_period: string | null;
  last_updated: string | null;
  file_format: string | null;
  license: string;
  access_tier: AccessTier;
  privacy_classification: "public" | "anonymized" | "sensitive";
  quality_notes: string;
  methodology: string | null;
  download_available: boolean;
  data_kind: DataKind;
  related_layers: string[];
}

export interface GlanceIndicator {
  id: string;
  label: string;
  value: string | null;
  unit: string | null;
  status: "available" | "tbd" | "unavailable";
  source_organization: string | null;
  reference_year: string | null;
  geographic_scope: string;
  last_updated: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  source_url: string | null;
  methodology: string | null;
}

export interface ConcernCategory {
  code: string;
  label: string;
  description: string;
}

export interface DataPackMeta {
  neighbourhood_id: NeighbourhoodId;
  title: string;
  subtitle: string;
  version: string;
  status: "draft" | "published";
  published_at: string | null;
  introduction: string;
  process_steps: string[];
  limitations: string[];
  privacy_guidance: string[];
  recommended_use: string[];
  glance: GlanceIndicator[];
  concern_taxonomy: ConcernCategory[];
  datasets: CatalogueDataset[];
}

const KILELESHWA_CONCERNS: ConcernCategory[] = [
  {
    code: "water",
    label: "Water",
    description: "Supply reliability, quality, and access observations.",
  },
  {
    code: "sewerage_drainage",
    label: "Sewerage and drainage",
    description: "Flooding, blocked drains, and sewerage service issues.",
  },
  {
    code: "waste_sanitation",
    label: "Waste and sanitation",
    description: "Solid waste, dumping, and sanitation service gaps.",
  },
  {
    code: "roads_mobility",
    label: "Roads, mobility, and walkability",
    description: "Carriageways, paths, crossings, and accessibility.",
  },
  {
    code: "street_lighting",
    label: "Street lighting",
    description: "Lighting coverage and outages affecting night movement.",
  },
  {
    code: "environment_green",
    label: "Environment and green space",
    description: "Trees, open space, and environmental quality.",
  },
  {
    code: "development_planning",
    label: "Development and planning",
    description: "Land-use change, density, and planning compliance concerns.",
  },
  {
    code: "safety_security",
    label: "Safety and security",
    description: "Personal safety perceptions and related public-realm issues.",
  },
  {
    code: "governance_services",
    label: "Governance and service delivery",
    description: "Institutional response and service delivery performance.",
  },
];

const KILELESHWA_GLANCE: GlanceIndicator[] = [
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

/** Catalogue entries — placeholders for acquisition, not fabricated findings. */
const KILELESHWA_DATASETS: CatalogueDataset[] = [
  {
    id: "kileleshwa-boundary-pending",
    neighbourhood_id: "kileleshwa",
    slug: "ward-boundary",
    title: "Kileleshwa ward boundary (pending)",
    description:
      "Authoritative administrative boundary polygon. Not yet ingested — provisional framing bbox must not be treated as official.",
    category: "boundaries",
    geographic_coverage: "Kileleshwa ward (TBD)",
    source_organization: "TBD (IEBC / Nairobi City County GIS)",
    source_url: null,
    published_at: null,
    acquired_at: null,
    observation_period: null,
    last_updated: null,
    file_format: "GeoJSON / GeoPackage",
    license: "TBD — follow source licence",
    access_tier: "open",
    privacy_classification: "public",
    quality_notes: "Missing. Do not publish area statistics until validated.",
    methodology: null,
    download_available: false,
    data_kind: "reference",
    related_layers: ["boundary"],
  },
  {
    id: "kileleshwa-concern-taxonomy",
    neighbourhood_id: "kileleshwa",
    slug: "concern-taxonomy",
    title: "Community concern taxonomy",
    description:
      "Nine planning concern categories for Kileleshwa (distinct from Kilimani hazard types).",
    category: "taxonomy",
    geographic_coverage: "Kileleshwa data pack",
    source_organization: "UrbanMesh Kileleshwa Data Package schema",
    source_url: null,
    published_at: "2026-10-22",
    acquired_at: "2026-10-22",
    observation_period: null,
    last_updated: "2026-10-22",
    file_format: "JSON (API)",
    license: "Product schema — redistribution per UrbanMesh pilot terms",
    access_tier: "open",
    privacy_classification: "public",
    quality_notes: "Structural taxonomy only; contains no community submissions yet.",
    methodology: "Defined for Growing Better community-led planning workflow.",
    download_available: false,
    data_kind: "reference",
    related_layers: [],
  },
];

export const DATA_PACKS: Record<NeighbourhoodId, DataPackMeta> = {
  kilimani: {
    neighbourhood_id: "kilimani",
    title: "Kilimani hazard evidence",
    subtitle: "Infrastructure reporting pilot",
    version: "1.0.0-pilot",
    status: "published",
    published_at: null,
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
    concern_taxonomy: [],
    datasets: [],
  },
  kileleshwa: {
    neighbourhood_id: "kileleshwa",
    title: "Growing Better: Community-Led Planning for Kileleshwa",
    subtitle: "Kileleshwa Data Package",
    version: "0.1.0-draft",
    status: "draft",
    published_at: null,
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
    concern_taxonomy: KILELESHWA_CONCERNS,
    datasets: KILELESHWA_DATASETS,
  },
};

export function getDataPack(id: NeighbourhoodId): DataPackMeta {
  return DATA_PACKS[id];
}

export function listOpenDatasets(id: NeighbourhoodId): CatalogueDataset[] {
  return DATA_PACKS[id].datasets.filter((d) => d.access_tier === "open");
}
