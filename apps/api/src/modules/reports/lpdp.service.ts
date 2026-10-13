import { mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { env } from "../../lib/env.js";
import { HttpError } from "../../lib/httpError.js";
import {
  listVerifiedClusters,
  type SpatialCluster,
} from "../clusters/clusters.service.js";

/**
 * On Render this is the attached disk (`LPDP_STORAGE_DIR=/var/data/lpdp`).
 */
export const LPDP_STORAGE_DIR = path.resolve(env.lpdpStorageDir);
export const LPDP_PDF_FILENAME = "UrbanMesh-LPDP-Policy-Brief.pdf";
export const LPDP_PDF_PATH = path.join(LPDP_STORAGE_DIR, LPDP_PDF_FILENAME);
/** Stable public download URL served by Express. */
export const LPDP_DOWNLOAD_URL = `/api/v1/lpdp/${LPDP_PDF_FILENAME}`;

export type LpdpCluster = SpatialCluster;

/** Load verified spatial clusters (grouped by cluster_id). */
export async function loadVerifiedClusters(
  clusterIds?: string[],
): Promise<LpdpCluster[]> {
  return listVerifiedClusters(
    clusterIds ? { ids: clusterIds } : undefined,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Print-styled HTML LPDP policy brief (A4). */
export function renderLpdpHtml(clusters: LpdpCluster[]): string {
  const generated = new Date().toLocaleString("en-KE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  });

  const sections =
    clusters.length === 0
      ? `<section class="cluster empty">
           <h2>No verified clusters</h2>
           <p>No high-risk clusters currently meet the 3+ confirmed citizen report threshold.</p>
         </section>`
      : clusters
          .map(
            (c, i) => `
    <section class="cluster">
      <h2>High-Risk Cluster ${i + 1}</h2>
      <dl>
        <div><dt>Hazard category</dt><dd>${escapeHtml(c.category_label)}</dd></div>
        <div><dt>Coordinates</dt><dd>${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</dd></div>
        <div><dt>Corridor</dt><dd>${escapeHtml(c.corridor)}</dd></div>
        <div><dt>Planning area</dt><dd>${escapeHtml(c.ward_name)}</dd></div>
        <div><dt>Citizen reports</dt><dd>${c.report_count}</dd></div>
        <div><dt>Verification status</dt><dd class="status">${escapeHtml(c.verification_status)}</dd></div>
        <div><dt>Cluster ID</dt><dd class="mono">${escapeHtml(c.cluster_id)}</dd></div>
      </dl>
      <p class="action">
        <strong>Recommended LPDP action:</strong>
        Prioritise site inspection and budget allocation for remedial works under the
        ${escapeHtml(c.category_label)} intervention envelope for ${escapeHtml(c.ward_name)}.
      </p>
    </section>`,
          )
          .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>UrbanMesh LPDP Policy Brief — Kilimani</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: #0b1f2a;
      font-size: 11pt;
      line-height: 1.45;
    }
    .title-block {
      border-bottom: 3px solid #0e7c6b;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 9pt;
      font-weight: 700;
      color: #0e7c6b;
      margin: 0 0 6px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 20pt;
      line-height: 1.2;
    }
    .meta { margin: 0; color: #1c3a4a; font-size: 10pt; }
    .summary {
      background: #e8f1f4;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 22px;
    }
    .cluster {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #c5d5dc;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 14px;
    }
    .cluster h2 {
      margin: 0 0 10px;
      font-size: 13pt;
      color: #0b1f2a;
    }
    dl { margin: 0; }
    dl > div {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 6px;
      padding: 4px 0;
      border-bottom: 1px solid #e8f1f4;
    }
    dt { font-weight: 700; color: #1c3a4a; }
    dd { margin: 0; }
    .status { color: #0a5c50; font-weight: 700; }
    .mono { font-family: ui-monospace, monospace; font-size: 9pt; }
    .action { margin: 12px 0 0; font-size: 10pt; }
    .empty { background: #f7fbfc; }
    footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #c5d5dc;
      font-size: 9pt;
      color: #1c3a4a;
    }
  </style>
</head>
<body>
  <header class="title-block">
    <p class="eyebrow">Nairobi County · Local Physical Development Plan</p>
    <h1>UrbanMesh LPDP Policy Brief — Kilimani Walkability &amp; Safety</h1>
    <p class="meta">
      Crowdsourced verified hazard clusters for county planning prioritisation.<br />
      Generated ${escapeHtml(generated)} (EAT) · Kilimani walkability &amp; safety · Nairobi City County
    </p>
  </header>

  <section class="summary">
    <strong>${clusters.length}</strong> high-risk verified cluster${clusters.length === 1 ? "" : "s"}
    currently meet the crowdsource threshold of three or more confirmed citizen reports within 15 metres.
  </section>

  ${sections}

  <footer>
    Source: UrbanMesh Incident API · Verification rule: ≥3 same-category reports within 15 m (PostGIS ST_DWithin).
    This brief is an operational input to the Kilimani LPDP — not a statutory plan amendment.
  </footer>
</body>
</html>`;
}

export interface LpdpGenerateResult {
  pdf_path: string;
  download_url: string;
  cluster_count: number;
  generated_at: string;
}

/**
 * Compile verified clusters → print HTML → A4 PDF via Puppeteer.
 * Writes to {@link LPDP_PDF_PATH}.
 */
export async function generateLpdpPdf(
  clusterIds?: string[],
): Promise<LpdpGenerateResult> {
  const clusters = await loadVerifiedClusters(clusterIds);
  const html = renderLpdpHtml(clusters);

  await mkdir(LPDP_STORAGE_DIR, { recursive: true });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: env.puppeteerExecutablePath || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.pdf({
        path: LPDP_PDF_PATH,
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", right: "14mm", bottom: "16mm", left: "14mm" },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(
      503,
      "Couldn't generate the LPDP brief. Check Chromium is available, then try again.",
    );
  }

  return {
    pdf_path: LPDP_PDF_PATH,
    download_url: LPDP_DOWNLOAD_URL,
    cluster_count: clusters.length,
    generated_at: new Date().toISOString(),
  };
}
