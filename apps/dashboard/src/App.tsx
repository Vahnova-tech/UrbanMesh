import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { PlannerShell } from "./components/layout/PlannerShell";
import { OverviewPage } from "./pages/OverviewPage";
import { LiveMapPage } from "./pages/LiveMapPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ClustersPage } from "./pages/ClustersPage";
import { EvidencePage } from "./pages/EvidencePage";
import { BriefsPage } from "./pages/BriefsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { Skeleton } from "./components/ui/Primitives";

const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((mod) => ({ default: mod.AnalyticsPage })),
);

const basename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<PlannerShell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/map" element={<LiveMapPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/clusters" element={<ClustersPage />} />
          <Route
            path="/analytics"
            element={
              <Suspense
                fallback={
                  <div className="p-6 lg:p-7" aria-busy>
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="mt-3 h-4 w-80" />
                    <div className="mt-6 grid gap-5 lg:grid-cols-2">
                      <Skeleton className="h-64" />
                      <Skeleton className="h-64" />
                    </div>
                  </div>
                }
              >
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/briefs" element={<BriefsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
