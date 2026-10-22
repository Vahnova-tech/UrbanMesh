import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { clearAdminToken, loadAdminToken, saveAdminToken } from "./lib/auth";
import { fetchDashboard, verifySession } from "./lib/api";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MapPage } from "./pages/MapPage";
import { PdfReportsPage } from "./pages/PdfReportsPage";
import { QueuePage } from "./pages/QueuePage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { ReportsListPage } from "./pages/ReportsListPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";
import { NeighbourhoodsPage } from "./pages/NeighbourhoodsPage";
import { CataloguePage } from "./pages/CataloguePage";
import { EvidenceQueuePage } from "./pages/EvidenceQueuePage";
import { DataQualityPage } from "./pages/DataQualityPage";
import { PackBuilderPage } from "./pages/PackBuilderPage";

const basename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const token = loadAdminToken();
      if (!token) {
        if (!cancelled) {
          setAuthed(false);
          setReady(true);
        }
        return;
      }
      const session = await verifySession();
      if (!cancelled) {
        setAuthed(session.ok);
        setReady(true);
      }
      if (session.ok) {
        try {
          const dash = await fetchDashboard();
          if (!cancelled) setPendingCount(dash.pending_review);
        } catch {
          /* ignore badge errors */
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  function onLogin(token: string) {
    saveAdminToken(token);
    setAuthed(true);
    void fetchDashboard()
      .then((d) => setPendingCount(d.pending_review))
      .catch(() => undefined);
  }

  function onLogout() {
    clearAdminToken();
    setAuthed(false);
    setPendingCount(0);
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-civic-muted">
        Loading…
      </div>
    );
  }

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route
          path="/login"
          element={
            authed ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLogin={onLogin} />
            )
          }
        />
        <Route
          element={
            authed ? (
              <AdminShell onLogout={onLogout} pendingCount={pendingCount} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="/" element={<DashboardPage onLogout={onLogout} />} />
          <Route path="/queue" element={<QueuePage onLogout={onLogout} />} />
          <Route path="/map" element={<MapPage onLogout={onLogout} />} />
          <Route
            path="/reports"
            element={
              <ReportsListPage
                title="All reports"
                subtitle="Search, filter, and open any hazard report."
                defaultReview="all"
                onLogout={onLogout}
              />
            }
          />
          <Route
            path="/reports/disproved"
            element={
              <ReportsListPage
                title="Disproved reports"
                subtitle="Claims marked disproved after authorized review. Excluded from public hazard views."
                defaultReview="disproved"
                onLogout={onLogout}
              />
            }
          />
          <Route
            path="/reports/archived"
            element={
              <ReportsListPage
                title="Deleted / archived"
                subtitle="Soft-deleted records retained for audit and restore."
                defaultReview="archived"
                onLogout={onLogout}
              />
            }
          />
          <Route
            path="/reports/resolved"
            element={
              <ReportsListPage
                title="Resolved issues"
                subtitle="Hazards marked resolved with supporting notes."
                defaultReview="resolved"
                onLogout={onLogout}
              />
            }
          />
          <Route
            path="/reports/:id"
            element={<ReportDetailPage onLogout={onLogout} />}
          />
          <Route
            path="/analytics"
            element={<AnalyticsPage onLogout={onLogout} />}
          />
          <Route path="/pdf" element={<PdfReportsPage />} />
          <Route path="/neighbourhoods" element={<NeighbourhoodsPage />} />
          <Route path="/catalogue" element={<CataloguePage />} />
          <Route
            path="/evidence"
            element={<EvidenceQueuePage onLogout={onLogout} />}
          />
          <Route path="/data-quality" element={<DataQualityPage />} />
          <Route path="/pack-builder" element={<PackBuilderPage />} />
          <Route
            path="/audit"
            element={<AuditLogsPage onLogout={onLogout} />}
          />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={authed ? "/" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
