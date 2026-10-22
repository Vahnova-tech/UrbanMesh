import { Router } from "express";
import { asyncHandler, HttpError } from "../../lib/httpError.js";
import {
  isNeighbourhoodId,
  neighbourhoodOrDefault,
} from "../../lib/neighbourhoods.js";
import { getBoundaryGeoJson } from "./boundary.service.js";
import {
  getDataPack,
  getNeighbourhoodFromDb,
  listDatasetsForNeighbourhood,
  listNeighbourhoodsFromDb,
  listOpenDatasets,
  redactDatasetForPublic,
} from "./catalogue.data.js";
import { listPublishedLayers, getLayerGeoJson } from "./layers.service.js";
import { searchCatalogue } from "./search.service.js";

export const catalogueRouter = Router();

catalogueRouter.get(
  "/neighbourhoods",
  asyncHandler(async (_req, res) => {
    const neighbourhoods = await listNeighbourhoodsFromDb();
    res.json({
      count: neighbourhoods.length,
      neighbourhoods,
    });
  }),
);

catalogueRouter.get(
  "/neighbourhoods/:id",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.id)) {
      throw new HttpError(404, "Unknown neighbourhood.");
    }
    res.json(await getNeighbourhoodFromDb(req.params.id));
  }),
);

catalogueRouter.get(
  "/neighbourhoods/:id/boundary",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.id)) {
      throw new HttpError(404, "Unknown neighbourhood.");
    }
    const boundary = await getBoundaryGeoJson(req.params.id);
    if (!boundary) {
      throw new HttpError(404, "No boundary available for this neighbourhood.");
    }
    res.json({
      neighbourhood_id: req.params.id,
      status: boundary.status,
      source: boundary.source,
      version: boundary.version,
      area_km2: boundary.area_km2,
      feature: boundary.feature,
    });
  }),
);

catalogueRouter.get(
  "/data-packs/:id",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.id)) {
      throw new HttpError(404, "Unknown data pack neighbourhood.");
    }
    const pack = await getDataPack(req.params.id);
    const open = await listOpenDatasets(req.params.id);
    res.json({
      ...pack,
      /** Restricted datasets are never listed with download URLs on this public route. */
      datasets: open.map(redactDatasetForPublic),
    });
  }),
);

catalogueRouter.get(
  "/catalogue",
  asyncHandler(async (req, res) => {
    const raw = String(req.query.neighbourhood ?? "kileleshwa");
    if (!isNeighbourhoodId(raw)) {
      throw new HttpError(400, "neighbourhood must be kilimani or kileleshwa.");
    }
    const tier = String(req.query.tier ?? "open").toLowerCase();
    let datasets = await listDatasetsForNeighbourhood(raw, {
      publishedOnly: true,
    });
    if (tier === "open") {
      datasets = datasets.filter((d) => d.access_tier === "open");
    } else if (tier === "all") {
      datasets = datasets.map((d) =>
        d.access_tier === "restricted"
          ? { ...d, download_available: false }
          : d,
      );
    } else {
      datasets = datasets.filter((d) => d.access_tier === tier);
      datasets = datasets.filter((d) => d.access_tier !== "restricted");
    }
    res.json({
      neighbourhood_id: raw,
      count: datasets.length,
      datasets: datasets.map(redactDatasetForPublic),
    });
  }),
);

catalogueRouter.get(
  "/layers",
  asyncHandler(async (req, res) => {
    const raw = String(req.query.neighbourhood ?? "kileleshwa");
    if (!isNeighbourhoodId(raw)) {
      throw new HttpError(400, "neighbourhood must be kilimani or kileleshwa.");
    }
    const layers = await listPublishedLayers(raw);
    res.json({
      neighbourhood_id: raw,
      count: layers.length,
      layers,
      attribution: "© OpenStreetMap contributors",
    });
  }),
);

catalogueRouter.get(
  "/layers/:neighbourhood/:layerKey",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.neighbourhood)) {
      throw new HttpError(404, "Unknown neighbourhood.");
    }
    const data = await getLayerGeoJson(
      req.params.neighbourhood,
      req.params.layerKey,
    );
    if (!data) {
      throw new HttpError(404, "Layer not found or empty.");
    }
    res.json(data);
  }),
);

catalogueRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const neighbourhood = req.query.neighbourhood
      ? String(req.query.neighbourhood)
      : undefined;
    if (neighbourhood && !isNeighbourhoodId(neighbourhood)) {
      throw new HttpError(400, "neighbourhood must be kilimani or kileleshwa.");
    }
    const category = req.query.category
      ? String(req.query.category)
      : undefined;
    const tier = req.query.tier ? String(req.query.tier) : undefined;
    const results = await searchCatalogue({
      q,
      neighbourhood: neighbourhood as
        | "kilimani"
        | "kileleshwa"
        | undefined,
      category,
      tier,
    });
    res.json(results);
  }),
);

// Keep default export helper for meta routes that need sync fallback
export { neighbourhoodOrDefault };
