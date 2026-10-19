import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { LocationProvider } from "./lib/location";
import { ThemeProvider } from "./lib/theme";
import { AppShell } from "./components/layout/AppShell";
import { MapHomePage } from "./pages/MapHomePage";
import { ReportsPage } from "./pages/ReportsPage";
import { MyReportsPage } from "./pages/MyReportsPage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { ReportSubmittedPage } from "./pages/ReportSubmittedPage";
import { ReportFlowPage } from "./pages/ReportFlowPage";
import { AboutPage } from "./pages/AboutPage";
import { CookiesPolicyPage } from "./pages/CookiesPolicyPage";

function HazardRedirect() {
  const { id = "" } = useParams();
  return <Navigate to={`/reports/${id}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/report" element={<Navigate to="/reports/new" replace />} />
            <Route path="/reports/new" element={<ReportFlowPage />} />
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
    </ThemeProvider>
  );
}
