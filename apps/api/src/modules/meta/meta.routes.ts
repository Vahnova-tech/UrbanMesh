import { Router, type Request, type Response } from "express";
import { env } from "../../lib/env.js";
import { PILOT_CORRIDORS } from "../../lib/corridors.js";
import { KILIMANI_WARDS } from "../../lib/wards.js";
import { HAZARD_LABELS } from "../../lib/categories.js";
import {
  isNeighbourhoodId,
} from "../../lib/neighbourhoods.js";
import { asyncHandler } from "../../lib/httpError.js";
import {
  getDataPack,
  getNeighbourhoodFromDb,
  listNeighbourhoodsFromDb,
} from "../catalogue/catalogue.data.js";

const metaRouter = Router();

metaRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const raw = req.query.neighbourhood;
    const id = isNeighbourhoodId(raw) ? raw : "kilimani";
    const neighbourhood = await getNeighbourhoodFromDb(id);
    const pack = await getDataPack(neighbourhood.id);
    const neighbourhoods = await listNeighbourhoodsFromDb();

    res.json({
      product: "UrbanMesh",
      planning_area: neighbourhood.display_name,
      neighbourhood_id: neighbourhood.id,
      neighbourhood,
      neighbourhoods,
      city: "Nairobi",
      county: "Nairobi City County",
      cluster_threshold: env.clusterThreshold,
      cluster_radius_meters: env.clusterRadiusMeters,
      h3_resolution: 10,
      reporting_mode: neighbourhood.reporting_mode,
      categories:
        neighbourhood.reporting_mode === "infrastructure_hazards"
          ? Object.entries(HAZARD_LABELS).map(([value, label]) => ({
              value,
              label,
            }))
          : pack.concern_taxonomy.map((c) => ({
              value: c.code,
              label: c.label,
            })),
      /** Kilimani pilot corridors remain Kilimani-specific until Kileleshwa corridors are sourced. */
      corridors:
        neighbourhood.id === "kilimani" ? PILOT_CORRIDORS : [],
      wards: neighbourhood.id === "kilimani" ? KILIMANI_WARDS : [],
      data_pack: {
        version: pack.version,
        status: pack.status,
        title: pack.title,
      },
    });
  }),
);

metaRouter.get(
  "/neighbourhoods",
  asyncHandler(async (_req: Request, res: Response) => {
    const neighbourhoods = await listNeighbourhoodsFromDb();
    res.json({ count: neighbourhoods.length, neighbourhoods });
  }),
);

metaRouter.get(
  "/neighbourhoods/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (!isNeighbourhoodId(req.params.id)) {
      res.status(404).json({ error: "Unknown neighbourhood." });
      return;
    }
    res.json(await getNeighbourhoodFromDb(req.params.id));
  }),
);

export { metaRouter };
