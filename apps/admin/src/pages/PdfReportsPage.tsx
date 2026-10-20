export function PdfReportsPage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="um-eyebrow">Insights</p>
        <h2 className="text-xl font-semibold text-civic-ink">PDF reports</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Evidence briefs (maps, charts, reporting periods, methodology) are
          generated from the county planner dashboard LPDP pipeline. Open that
          dashboard to export briefs. Admin-native PDF export will wire to the
          same authenticated endpoints when productized here.
        </p>
        <p className="mt-4 rounded-card border border-civic-line bg-civic-surface px-4 py-3 text-sm text-civic-muted">
          No mock PDFs are offered from this screen — exports must come from live
          backend jobs.
        </p>
      </div>
    </div>
  );
}
