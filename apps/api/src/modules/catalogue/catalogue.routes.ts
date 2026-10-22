import { Router } from "express";
import { asyncHandler, HttpError } from "../../lib/httpError.js";
import {
  isNeighbourhoodId,
  listNeighbourhoods,
  neighbourhoodOrDefault,
} from "../../lib/neighbourhoods.js";
import { getDataPack, listOpenDatasets } from "./catalogue.data.js";

export const catalogueRouter = Router();

catalogueRouter.get(
  "/neighbourhoods",
  asyncHandler(async (_req, res) => {
    res.json({
      count: 2,
      neighbourhoods: listNeighbourhoods(),
    });
  }),
);

catalogueRouter.get(
  "/neighbourhoods/:id",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.id)) {
      throw new HttpError(404, "Unknown neighbourhood.");
    }
    res.json(neighbourhoodOrDefault(req.params.id));
  }),
);

catalogueRouter.get(
  "/data-packs/:id",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.id)) {
      throw new HttpError(404, "Unknown data pack neighbourhood.");
    }
    const pack = getDataPack(req.params.id);
    res.json({
      ...pack,
      /** Restricted datasets are never listed with download URLs on this public route. */
      datasets: listOpenDatasets(req.params.id).map((d) => ({
        ...d,
        download_url: null,
      })),
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
    const pack = getDataPack(raw);
    const tier = String(req.query.tier ?? "open").toLowerCase();
    let datasets = pack.datasets;
    if (tier === "open") {
      datasets = datasets.filter((d) => d.access_tier === "open");
    } else if (tier === "all") {
      // Public catalogue still redacts restricted download availability
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
      datasets: datasets.map((d) => ({ ...d, download_url: null })),
    });
  }),
);
