import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { LocationProvider } from "./lib/location";
import { NeighbourhoodProvider } from "./lib/neighbourhood";
import { ThemeProvider } from "./lib/theme";
import { AppShell } from "./components/layout/AppShell";
import { MapHomePage } from "./pages/MapHomePage";
import { ReportsPage } from "./pages/ReportsPage";
import { MyReportsPage } from "./pages/MyReportsPage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { ReportSubmittedPage } from "./pages/ReportSubmittedPage";
import { ReportFlowPage } from "./pages/ReportFlowPage";
import { ConcernFlowPage } from "./pages/ConcernFlowPage";
import { ConcernDetailPage } from "./pages/ConcernDetailPage";
import { AboutPage } from "./pages/AboutPage";
import { CookiesPolicyPage } from "./pages/CookiesPolicyPage";
import { DataPackPage } from "./pages/DataPackPage";
import { NeighbourhoodsPage } from "./pages/NeighbourhoodsPage";
import { SearchPage } from "./pages/SearchPage";

function HazardRedirect() {
  const { id = "" } = useParams();
  return <Navigate to={`/reports/${id}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <NeighbourhoodProvider>
        <LocationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/report" element={<Navigate to="/reports/new" replace />} />
              <Route path="/reports/new" element={<ReportFlowPage />} />
              <Route path="/concerns/new" element={<ConcernFlowPage />} />
              <Route
                path="/concerns/:id"
                element={
                  <AppShell>
                    <ConcernDetailPage />
                  </AppShell>
                }
              />
              <Route
                path="/reports/:id/submitted"
                element={
                  <AppShell>
                    <ReportSubmittedPage />
                  </AppShell>
                }
              />
              <Route
                path="/reports/:id"
                element={
                  <AppShell>
                    <ReportDetailPage />
                  </AppShell>
                }
              />
              <Route
                path="/reports"
                element={
                  <AppShell>
                    <ReportsPage />
                  </AppShell>
                }
              />
              <Route
                path="/"
                element={
                  <AppShell>
                    <MapHomePage />
                  </AppShell>
                }
              />
              <Route
                path="/me"
                element={
                  <AppShell>
                    <MyReportsPage />
                  </AppShell>
                }
              />
              <Route path="/hazards/:id" element={<HazardRedirect />} />
              <Route
                path="/neighbourhoods"
                element={
                  <AppShell>
                    <NeighbourhoodsPage />
                  </AppShell>
                }
              />
              <Route
                path="/kileleshwa"
                element={
                  <AppShell>
                    <DataPackPage />
                  </AppShell>
                }
              />
              <Route
                path="/data-pack"
                element={<Navigate to="/kileleshwa" replace />}
              />
              <Route
                path="/search"
                element={
                  <AppShell>
                    <SearchPage />
                  </AppShell>
                }
              />
              <Route
                path="/about"
                element={
                  <AppShell>
                    <AboutPage />
                  </AppShell>
                }
              />
              <Route
                path="/cookies"
                element={
                  <AppShell>
                    <CookiesPolicyPage />
                  </AppShell>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </LocationProvider>
      </NeighbourhoodProvider>
    </ThemeProvider>
  );
}
