import { useState, type FormEvent } from "react";
import { saveAdminToken } from "../lib/auth";
import { verifySession } from "../lib/api";

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const value = token.trim();
    if (!value) {
      setError("Enter the admin API token.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      saveAdminToken(value);
      const ok = await verifySession();
      if (!ok) {
        setError("That token was rejected. Check ADMIN_API_TOKEN on the API.");
        return;
      }
      onLogin(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-md rounded-card border border-civic-line bg-civic-surface p-6 shadow-card"
      >
        <p className="um-eyebrow">UrbanMesh · Kilimani</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-civic-ink">
          Operations admin
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Review, verify, moderate, and resolve hazard reports. Field verification is
          separate from community spatial corroboration (≥3 within 15 m).
        </p>

        <label className="mt-6 block text-xs font-semibold text-civic-slate">
          Admin API token
          <input
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-card border border-civic-line bg-civic-paper px-3 text-sm text-civic-ink outline-none focus:border-civic-accent"
            placeholder="ADMIN_API_TOKEN"
          />
        </label>

        {error ? (
          <p className="mt-3 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm font-medium text-civic-critical">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-card bg-civic-accent text-sm font-semibold text-white hover:bg-civic-accentDark disabled:opacity-60"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
