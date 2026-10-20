import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { clearAdminToken, loadAdminToken, saveAdminToken } from "./lib/auth";
import { verifySession } from "./lib/api";
import { LoginPage } from "./pages/LoginPage";
import { QueuePage } from "./pages/QueuePage";

const basename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

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
      const ok = await verifySession();
      if (!cancelled) {
        setAuthed(ok);
        setReady(true);
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
  }

  function onLogout() {
    clearAdminToken();
    setAuthed(false);
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
          path="/"
          element={
            authed ? (
              <QueuePage onLogout={onLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={authed ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
