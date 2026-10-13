import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { PlannerShell } from "./components/layout/PlannerShell";
import { OverviewPage } from "./pages/OverviewPage";
import { LiveMapPage } from "./pages/LiveMapPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ClustersPage } from "./pages/ClustersPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { EvidencePage } from "./pages/EvidencePage";
import { BriefsPage } from "./pages/BriefsPage";
import { SettingsPage } from "./pages/SettingsPage";

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
          <Route path="/analytics" element={<AnalyticsPage />} />
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
