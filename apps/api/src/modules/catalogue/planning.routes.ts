import { Router } from "express";
import { asyncHandler, HttpError } from "../../lib/httpError.js";
import { isNeighbourhoodId } from "../../lib/neighbourhoods.js";
import {
  listChangeTimeline,
  listParticipantProposals,
  listPlanningDocuments,
  submitParticipantProposal,
} from "./planning.service.js";

export const planningRouter = Router();

planningRouter.get(
  "/timeline",
  asyncHandler(async (req, res) => {
    const raw = String(req.query.neighbourhood ?? "kileleshwa");
    if (!isNeighbourhoodId(raw)) {
      throw new HttpError(400, "neighbourhood must be kilimani or kileleshwa.");
    }
    const items = await listChangeTimeline(raw);
    res.json({
      neighbourhood_id: raw,
      count: items.length,
      items,
      note: "Before/after imagery only when two licensed image refs exist.",
    });
  }),
);

planningRouter.get(
  "/documents",
  asyncHandler(async (req, res) => {
    const raw = String(req.query.neighbourhood ?? "kileleshwa");
    if (!isNeighbourhoodId(raw)) {
      throw new HttpError(400, "neighbourhood must be kilimani or kileleshwa.");
    }
    const docs = await listPlanningDocuments(raw);
    res.json({
      neighbourhood_id: raw,
      count: docs.length,
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        source_url: d.sourceUrl,
        document_date: d.documentDate?.toISOString() ?? null,
        summary: d.summary,
      })),
    });
  }),
);

planningRouter.get(
  "/proposals",
  asyncHandler(async (req, res) => {
    const raw = String(req.query.neighbourhood ?? "kileleshwa");
    if (!isNeighbourhoodId(raw)) {
      throw new HttpError(400, "neighbourhood must be kilimani or kileleshwa.");
    }
    const rows = await listParticipantProposals(raw);
    res.json({
      neighbourhood_id: raw,
      count: rows.length,
      proposals: rows.map((p) => ({
        id: p.id,
        title: p.title,
        problem_statement: p.problemStatement,
        interpretation: p.interpretation,
        created_at: p.createdAt.toISOString(),
        label: "Participant interpretation — not official",
      })),
    });
  }),
);

planningRouter.post(
  "/proposals",
  asyncHandler(async (req, res) => {
    const neighbourhoodId = String(req.body?.neighbourhood_id ?? "kileleshwa");
    if (!isNeighbourhoodId(neighbourhoodId)) {
      throw new HttpError(400, "neighbourhood_id must be kilimani or kileleshwa.");
    }
    const title = String(req.body?.title ?? "").trim();
    const problemStatement = String(req.body?.problem_statement ?? "").trim();
    const interpretation = String(
      req.body?.interpretation ?? "participant_interpretation",
    ).trim();
    if (title.length < 3 || problemStatement.length < 10) {
      throw new HttpError(
        400,
        "Provide a title and a problem statement (at least 10 characters).",
      );
    }
    const row = await submitParticipantProposal({
      neighbourhoodId,
      title,
      problemStatement,
      interpretation,
    });
    res.status(201).json({
      id: row.id,
      title: row.title,
      label: "Participant interpretation — not official",
    });
  }),
);
