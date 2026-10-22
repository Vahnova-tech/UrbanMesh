import { DatasetAccessTier, DatasetDataKind, type Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NEIGHBOURHOODS } from "../../lib/neighbourhoods.js";

const KILELESHWA_CONCERNS: Array<{
  code: string;
  label: string;
  description: string;
  sortOrder: number;
}> = [
  {
    code: "water",
    label: "Water",
    description: "Supply reliability, quality, and access observations.",
    sortOrder: 1,
  },
  {
    code: "sewerage_drainage",
    label: "Sewerage and drainage",
    description: "Flooding, blocked drains, and sewerage service issues.",
    sortOrder: 2,
  },
  {
    code: "waste_sanitation",
    label: "Waste and sanitation",
    description: "Solid waste, dumping, and sanitation service gaps.",
    sortOrder: 3,
  },
  {
    code: "roads_mobility",
    label: "Roads, mobility, and walkability",
    description: "Carriageways, paths, crossings, and accessibility.",
    sortOrder: 4,
  },
  {
    code: "street_lighting",
    label: "Street lighting",
    description: "Lighting coverage and outages affecting night movement.",
    sortOrder: 5,
  },
  {
    code: "environment_green",
    label: "Environment and green space",
    description: "Trees, open space, and environmental quality.",
    sortOrder: 6,
  },
  {
    code: "development_planning",
    label: "Development and planning",
    description: "Land-use change, density, and planning compliance concerns.",
    sortOrder: 7,
  },
  {
    code: "safety_security",
    label: "Safety and security",
    description: "Personal safety perceptions and related public-realm issues.",
    sortOrder: 8,
  },
  {
    code: "governance_services",
    label: "Governance and service delivery",
    description: "Institutional response and service delivery performance.",
    sortOrder: 9,
  },
];

const OPEN_REFERENCE_DATASETS: Prisma.DatasetCreateInput[] = [
  {
    neighbourhood: { connect: { id: "kileleshwa" } },
    slug: "ward-boundary",
    title: "Kileleshwa ward boundary (pending)",
    description:
      "Authoritative administrative boundary polygon. Provisional OSM framing must not be treated as IEBC.",
    category: "boundaries",
    geographicCoverage: "Kileleshwa ward (TBD)",
    sourceOrganization: "TBD (IEBC / Nairobi City County GIS)",
    sourceUrl: null,
    publishedAt: null,
    acquiredAt: null,
    observationPeriod: null,
    lastUpdated: null,
    fileFormat: "GeoJSON / GeoPackage",
    license: "TBD — follow source licence",
    accessTier: DatasetAccessTier.open,
    privacyClassification: "public",
    qualityNotes: "Missing. Do not publish area statistics until validated.",
    methodology: null,
    downloadAvailable: false,
    dataKind: DatasetDataKind.reference,
    published: true,
    relatedLayersJson: JSON.stringify(["boundary"]),
  },
  {
    neighbourhood: { connect: { id: "kileleshwa" } },
    slug: "concern-taxonomy",
    title: "Community concern taxonomy",
    description:
      "Nine planning concern categories for Kileleshwa (distinct from Kilimani hazard types).",
    category: "taxonomy",
    geographicCoverage: "Kileleshwa data pack",
    sourceOrganization: "UrbanMesh Kileleshwa Data Package schema",
    sourceUrl: null,
    publishedAt: new Date("2026-10-22"),
    acquiredAt: new Date("2026-10-22"),
    observationPeriod: null,
    lastUpdated: new Date("2026-10-22"),
    fileFormat: "JSON (API)",
    license: "Product schema — redistribution per UrbanMesh pilot terms",
    accessTier: DatasetAccessTier.open,
    privacyClassification: "public",
    qualityNotes: "Structural taxonomy only; contains no community submissions yet.",
    methodology: "Defined for Growing Better community-led planning workflow.",
    downloadAvailable: false,
    dataKind: DatasetDataKind.reference,
    published: true,
    relatedLayersJson: JSON.stringify([]),
  },
];

/** Upsert neighbourhoods, open reference datasets, concern types, and draft pack. */
export async function seedCatalogueReference(): Promise<void> {
  for (const cfg of Object.values(NEIGHBOURHOODS)) {
    await prisma.neighbourhood.upsert({
      where: { id: cfg.id },
      create: {
        id: cfg.id,
        displayName: cfg.display_name,
        centerLat: cfg.center[0],
        centerLng: cfg.center[1],
        bboxJson: JSON.stringify(cfg.bbox),
        boundaryStatus: cfg.boundary_status,
        boundarySource: cfg.boundary_source,
        boundaryNote: cfg.boundary_note,
        reportingMode: cfg.reporting_mode,
        description: cfg.description,
        active: true,
      },
      update: {
        displayName: cfg.display_name,
        centerLat: cfg.center[0],
        centerLng: cfg.center[1],
        bboxJson: JSON.stringify(cfg.bbox),
        boundaryStatus: cfg.boundary_status,
        boundarySource: cfg.boundary_source,
        boundaryNote: cfg.boundary_note,
        reportingMode: cfg.reporting_mode,
        description: cfg.description,
        active: true,
      },
    });
  }

  await prisma.dataPack.upsert({
    where: {
      neighbourhoodId_version: {
        neighbourhoodId: "kilimani",
        version: "1.0.0-pilot",
      },
    },
    create: {
      neighbourhoodId: "kilimani",
      version: "1.0.0-pilot",
      title: "Kilimani hazard evidence",
      status: "published",
      summary:
        "Kilimani focuses on resident infrastructure hazard reports with spatial community corroboration for county planning input.",
      methodology: "Report → corroborate → review → field-verify → LPDP brief.",
    },
    update: {
      title: "Kilimani hazard evidence",
      status: "published",
    },
  });

  await prisma.dataPack.upsert({
    where: {
      neighbourhoodId_version: {
        neighbourhoodId: "kileleshwa",
        version: "0.1.0-draft",
      },
    },
    create: {
      neighbourhoodId: "kileleshwa",
      version: "0.1.0-draft",
      title: "Growing Better: Community-Led Planning for Kileleshwa",
      status: "draft",
      summary:
        "Structured evidence resource. Statistics appear only when sourced.",
      methodology:
        "Missing indicators are TBD. Provisional bbox is not used for published area stats.",
    },
    update: {
      title: "Growing Better: Community-Led Planning for Kileleshwa",
    },
  });

  for (const row of KILELESHWA_CONCERNS) {
    await prisma.concernType.upsert({
      where: {
        neighbourhoodId_code: {
          neighbourhoodId: "kileleshwa",
          code: row.code,
        },
      },
      create: {
        neighbourhoodId: "kileleshwa",
        code: row.code,
        label: row.label,
        description: row.description,
        sortOrder: row.sortOrder,
      },
      update: {
        label: row.label,
        description: row.description,
        sortOrder: row.sortOrder,
      },
    });
  }

  for (const ds of OPEN_REFERENCE_DATASETS) {
    const slug = ds.slug;
    const neighbourhoodId = "kileleshwa" as const;
    await prisma.dataset.upsert({
      where: {
        neighbourhoodId_slug: { neighbourhoodId, slug },
      },
      create: ds,
      update: {
        title: ds.title,
        description: ds.description,
        category: ds.category,
        geographicCoverage: ds.geographicCoverage,
        sourceOrganization: ds.sourceOrganization,
        license: ds.license,
        accessTier: ds.accessTier,
        privacyClassification: ds.privacyClassification,
        qualityNotes: ds.qualityNotes,
        methodology: ds.methodology,
        downloadAvailable: ds.downloadAvailable,
        dataKind: ds.dataKind,
        published: ds.published,
        relatedLayersJson: ds.relatedLayersJson,
        fileFormat: ds.fileFormat,
      },
    });
  }
}
