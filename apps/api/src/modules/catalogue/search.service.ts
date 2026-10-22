import { prisma } from "../../lib/prisma.js";
import type { NeighbourhoodId } from "../../lib/neighbourhoods.js";
import { isNeighbourhoodId } from "../../lib/neighbourhoods.js";

export interface SearchHit {
  kind: "dataset" | "concern" | "layer" | "planning_doc" | "proposal" | "hazard";
  id: string;
  neighbourhood_id: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  href: string;
}

export async function searchCatalogue(opts: {
  q: string;
  neighbourhood?: NeighbourhoodId;
  category?: string;
  tier?: string;
}): Promise<{ count: number; results: SearchHit[] }> {
  const q = opts.q.trim();
  if (q.length < 2) {
    return { count: 0, results: [] };
  }
  const nId = opts.neighbourhood;
  const results: SearchHit[] = [];
  const like = `%${q.replace(/%/g, "")}%`;

  const datasets = await prisma.dataset.findMany({
    where: {
      published: true,
      ...(nId ? { neighbourhoodId: nId } : {}),
      ...(opts.tier && opts.tier !== "all"
        ? { accessTier: opts.tier as "open" | "restricted" | "synthetic" }
        : { accessTier: { not: "restricted" } }),
      ...(opts.category ? { category: opts.category } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 20,
  });
  for (const d of datasets) {
    results.push({
      kind: "dataset",
      id: d.id,
      neighbourhood_id: d.neighbourhoodId,
      title: d.title,
      subtitle: d.category,
      category: d.category,
      href:
        d.neighbourhoodId === "kileleshwa"
          ? "/kileleshwa"
          : "/catalogue",
    });
  }

  const concerns = await prisma.concern.findMany({
    where: {
      reviewStatus: "accepted",
      synthetic: false,
      ...(nId ? { neighbourhoodId: nId } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { concernTypeCode: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 20,
  });
  for (const c of concerns) {
    results.push({
      kind: "concern",
      id: c.id,
      neighbourhood_id: c.neighbourhoodId,
      title: c.title,
      subtitle: c.concernTypeCode,
      category: c.concernTypeCode,
      href: `/concerns/${c.id}`,
    });
  }

  const layers = await prisma.mapLayer.findMany({
    where: {
      published: true,
      featureCount: { gt: 0 },
      ...(nId ? { neighbourhoodId: nId } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { layerKey: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
  });
  for (const l of layers) {
    results.push({
      kind: "layer",
      id: l.id,
      neighbourhood_id: l.neighbourhoodId,
      title: l.title,
      subtitle: l.category,
      category: l.category,
      href: "/",
    });
  }

  const docs = await prisma.planningDocument.findMany({
    where: {
      published: true,
      ...(nId ? { neighbourhoodId: nId } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
  });
  for (const d of docs) {
    results.push({
      kind: "planning_doc",
      id: d.id,
      neighbourhood_id: d.neighbourhoodId,
      title: d.title,
      subtitle: d.summary,
      category: "planning",
      href: "/kileleshwa",
    });
  }

  const proposals = await prisma.participantProposal.findMany({
    where: {
      published: true,
      ...(nId ? { neighbourhoodId: nId } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { problemStatement: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
  });
  for (const p of proposals) {
    results.push({
      kind: "proposal",
      id: p.id,
      neighbourhood_id: p.neighbourhoodId,
      title: p.title,
      subtitle: "Participant submission",
      category: "proposal",
      href: "/kileleshwa",
    });
  }

  // Kilimani public hazards (description contains) — only when neighbourhood allows
  if (!nId || nId === "kilimani") {
    try {
      const hazards = await prisma.$queryRawUnsafe<
        Array<{ id: string; category: string; description: string }>
      >(
        `SELECT id::text, category::text, left(description, 120) AS description
         FROM incidents
         WHERE review_status NOT IN ('ARCHIVED', 'DISPROVED', 'REJECTED')
           AND description ILIKE $1
         LIMIT 15`,
        like,
      );
      for (const h of hazards) {
        results.push({
          kind: "hazard",
          id: h.id,
          neighbourhood_id: "kilimani",
          title: h.category.replace(/_/g, " "),
          subtitle: h.description,
          category: h.category,
          href: `/reports/${h.id}`,
        });
      }
    } catch {
      /* table may lack rows */
    }
  }

  void isNeighbourhoodId;
  return { count: results.length, results };
}
