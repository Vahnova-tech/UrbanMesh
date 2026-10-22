import { prisma } from "../../lib/prisma.js";
import type { NeighbourhoodId } from "../../lib/neighbourhoods.js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { env } from "../../lib/env.js";
import { listOpenDatasets } from "./catalogue.data.js";
import { listPublishedLayers } from "./layers.service.js";

export async function listChangeTimeline(neighbourhood: NeighbourhoodId) {
  const rows = await prisma.changeObservation.findMany({
    where: { neighbourhoodId: neighbourhood, published: true },
    orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    observed_at: r.observedAt?.toISOString() ?? null,
    source_url: r.sourceUrl,
    notes: r.notes,
    before_after_available: Boolean(r.beforeImageRef && r.afterImageRef),
    before_image_ref: r.beforeImageRef,
    after_image_ref: r.afterImageRef,
  }));
}

export async function listPlanningDocuments(neighbourhood: NeighbourhoodId) {
  return prisma.planningDocument.findMany({
    where: { neighbourhoodId: neighbourhood, published: true },
    orderBy: { documentDate: "desc" },
  });
}

export async function listParticipantProposals(neighbourhood: NeighbourhoodId) {
  return prisma.participantProposal.findMany({
    where: { neighbourhoodId: neighbourhood, published: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function submitParticipantProposal(input: {
  neighbourhoodId: NeighbourhoodId;
  title: string;
  problemStatement: string;
  interpretation: string;
}) {
  return prisma.participantProposal.create({
    data: {
      neighbourhoodId: input.neighbourhoodId,
      title: input.title.trim().slice(0, 200),
      problemStatement: input.problemStatement.trim().slice(0, 4000),
      interpretation: input.interpretation.trim().slice(0, 500),
      published: true,
    },
  });
}

export async function publishDataPackVersion(input: {
  neighbourhoodId: NeighbourhoodId;
  version: string;
  title: string;
  datasetIds: string[];
  layerKeys: string[];
  methodology?: string;
  summary?: string;
  actor?: string;
}) {
  const contentJson = JSON.stringify({
    dataset_ids: input.datasetIds,
    layer_keys: input.layerKeys,
  });

  // Archive previous published packs for this neighbourhood
  await prisma.dataPack.updateMany({
    where: {
      neighbourhoodId: input.neighbourhoodId,
      status: "published",
    },
    data: { status: "archived" },
  });

  const pack = await prisma.dataPack.upsert({
    where: {
      neighbourhoodId_version: {
        neighbourhoodId: input.neighbourhoodId,
        version: input.version,
      },
    },
    create: {
      neighbourhoodId: input.neighbourhoodId,
      version: input.version,
      title: input.title,
      status: "published",
      publishedAt: new Date(),
      summary: input.summary,
      methodology: input.methodology,
      contentJson,
    },
    update: {
      title: input.title,
      status: "published",
      publishedAt: new Date(),
      summary: input.summary,
      methodology: input.methodology,
      contentJson,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      action: "data_pack.publish",
      actor: input.actor ?? "admin",
      afterJson: JSON.stringify({
        neighbourhood_id: input.neighbourhoodId,
        version: input.version,
        dataset_ids: input.datasetIds,
        layer_keys: input.layerKeys,
      }),
    },
  });

  return pack;
}

/** Build a zip-like folder manifest of open-tier files for a pack (filesystem export). */
export async function exportDataPackManifest(
  neighbourhood: NeighbourhoodId,
  version: string,
): Promise<{ dir: string; manifest: Record<string, unknown> }> {
  const pack = await prisma.dataPack.findUnique({
    where: {
      neighbourhoodId_version: {
        neighbourhoodId: neighbourhood,
        version,
      },
    },
  });
  if (!pack) throw new Error("Data pack version not found.");

  const datasets = await listOpenDatasets(neighbourhood);
  const layers = await listPublishedLayers(neighbourhood);
  const outDir = path.join(
    env.datasetStoragePath,
    "exports",
    `${neighbourhood}_${version}`,
  );
  mkdirSync(outDir, { recursive: true });

  const manifest = {
    neighbourhood_id: neighbourhood,
    version,
    title: pack.title,
    exported_at: new Date().toISOString(),
    datasets: datasets.map((d) => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      access_tier: d.access_tier,
      download_available: d.download_available,
    })),
    layers: layers.map((l) => ({
      layer_key: l.layer_key,
      title: l.title,
      feature_count: l.feature_count,
      attribution: l.attribution,
    })),
    note: "Restricted files are excluded. Synthetic data must remain labelled.",
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  return { dir: outDir, manifest };
}

export async function getDataQualityAnalytics() {
  const [
    datasets,
    byTier,
    unpublished,
    concernsUnderReview,
    syntheticConcerns,
    packs,
    layers,
    missingMeta,
  ] = await Promise.all([
    prisma.dataset.groupBy({
      by: ["category"],
      _count: true,
    }),
    prisma.dataset.groupBy({
      by: ["accessTier"],
      _count: true,
    }),
    prisma.dataset.count({ where: { published: false } }),
    prisma.concern.count({ where: { reviewStatus: "under_review" } }),
    prisma.concern.count({ where: { synthetic: true } }),
    prisma.dataPack.findMany({
      select: { neighbourhoodId: true, version: true, status: true },
    }),
    prisma.mapLayer.findMany({
      select: {
        neighbourhoodId: true,
        layerKey: true,
        featureCount: true,
        refreshedAt: true,
        published: true,
      },
    }),
    prisma.dataset.count({
      where: {
        OR: [
          { sourceOrganization: "" },
          { license: "" },
          { qualityNotes: "" },
        ],
      },
    }),
  ]);

  return {
    datasets_by_category: datasets.map((d) => ({
      category: d.category,
      count: d._count,
    })),
    datasets_by_tier: byTier.map((d) => ({
      tier: d.accessTier,
      count: d._count,
    })),
    unpublished_datasets: unpublished,
    missing_metadata_fields: missingMeta,
    concerns_awaiting_review: concernsUnderReview,
    synthetic_concerns: syntheticConcerns,
    pack_versions: packs,
    layers: layers.map((l) => ({
      neighbourhood_id: l.neighbourhoodId,
      layer_key: l.layerKey,
      feature_count: l.featureCount,
      published: l.published,
      refreshed_at: l.refreshedAt?.toISOString() ?? null,
    })),
    note: "Counts from database only. No completeness percentage is inferred.",
  };
}
