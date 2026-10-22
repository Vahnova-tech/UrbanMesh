import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { LocationProvider } from "./lib/location";
import { NeighbourhoodProvider, useNeighbourhood } from "./lib/neighbourhood";
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

function pageLabel(pathname: string): string | null {
  if (pathname === "/") return null;
  if (pathname === "/reports/new" || pathname === "/report") return "Report a hazard";
  if (pathname.startsWith("/reports/") && pathname.endsWith("/submitted")) return "Report sent";
  if (pathname.startsWith("/reports/") || pathname.startsWith("/hazards/")) return "Report";
  if (pathname === "/reports") return "Reports";
  if (pathname === "/concerns/new") return "Submit a concern";
  if (pathname.startsWith("/concerns/")) return "Concern";
  if (pathname === "/neighbourhoods") return "Neighbourhoods";
  if (pathname === "/search") return "Search";
  if (pathname === "/me") return "My Reports";
  if (pathname === "/about") return "About";
  if (pathname === "/cookies") return "Cookies";
  if (pathname === "/kileleshwa" || pathname === "/data-pack") return "Kileleshwa";
  return null;
}

function DocumentTitle() {
  const { pathname } = useLocation();
  const { neighbourhood } = useNeighbourhood();
  useEffect(() => {
    const page = pageLabel(pathname);
    const area = neighbourhood.short_label;
    document.title = page ? `${page} · ${area}` : `UrbanMesh · ${area}`;
  }, [pathname, neighbourhood.short_label]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <NeighbourhoodProvider>
        <LocationProvider>
          <BrowserRouter>
            <DocumentTitle />
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
