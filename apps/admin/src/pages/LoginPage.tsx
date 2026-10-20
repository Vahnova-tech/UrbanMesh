import { useId, useState, type FormEvent } from "react";
import { BrandMark } from "../components/BrandMark";
import { saveAdminToken } from "../lib/auth";
import { verifySession } from "../lib/api";

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorId = useId();
  const tokenId = useId();

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const value = token.trim();
    if (!value) {
      setError("Enter the admin API token to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      saveAdminToken(value);
      const session = await verifySession();
      if (!session.ok) {
        setError("That token was rejected. Confirm ADMIN_API_TOKEN on the API.");
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
    <div className="relative flex min-h-full flex-col bg-civic-paper">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-civic-mist/70"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-[42%] h-px bg-civic-line"
        aria-hidden
      />

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <p className="mt-4 text-[1.75rem] font-semibold tracking-tight text-civic-ink sm:text-[2rem]">
            UrbanMesh
          </p>
          <p className="mt-1 text-sm font-medium text-civic-muted">
            Kilimani · Field operations
          </p>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="w-full max-w-[26rem] rounded-card border border-civic-line bg-civic-surface p-6 shadow-card sm:p-7"
          noValidate
        >
          <h1 className="text-lg font-semibold tracking-tight text-civic-ink">
            Sign in to admin
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-civic-slate">
            Authorized operators only. Review evidence, disprove invalid claims,
            and track resolution — separate from community corroboration.
          </p>

          <div className="mt-6">
            <label
              htmlFor={tokenId}
              className="block text-xs font-semibold text-civic-slate"
            >
              Admin API token
            </label>
            <div className="relative mt-1.5">
              <input
                id={tokenId}
                type={showToken ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className="min-h-11 w-full rounded-card border border-civic-line bg-civic-paper py-2 pl-3 pr-20 font-mono text-sm text-civic-ink outline-none transition-colors placeholder:font-sans placeholder:text-civic-muted focus:border-civic-accent disabled:opacity-60"
                placeholder="Paste ADMIN_API_TOKEN"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-1.5 top-1/2 min-h-8 -translate-y-1/2 rounded-md px-2.5 text-[11px] font-semibold text-civic-muted hover:bg-civic-mist hover:text-civic-ink"
                aria-pressed={showToken}
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error ? (
            <p
              id={errorId}
              role="alert"
              className="mt-3 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm font-medium text-civic-critical"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !token.trim()}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-card bg-civic-accent text-sm font-semibold text-white transition-colors hover:bg-civic-accentDark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-civic-muted">
            Access uses a shared server token. Do not enter personal passwords or
            reporter accounts.
          </p>
        </form>
      </div>

      <footer className="relative z-[1] px-4 pb-6 text-center text-[11px] text-civic-muted">
        UrbanMesh admin · Restricted access · No public indexing
      </footer>
    </div>
  );
}
