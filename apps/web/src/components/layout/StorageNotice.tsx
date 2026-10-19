import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "urbanmesh.storageNotice";

export function StorageNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "seen") return;
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "seen");
    } catch {
      /* private mode */
    }
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Storage notice"
      className="pointer-events-auto fixed inset-x-3 bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] z-[2100] mx-auto max-w-lg rounded-card border border-civic-line bg-civic-surface p-3.5 shadow-card md:inset-x-auto md:bottom-6 md:left-6 md:right-auto"
    >
      <p className="text-sm font-semibold text-civic-ink">Device storage</p>
      <p className="mt-1.5 text-xs leading-relaxed text-civic-slate">
        UrbanMesh uses on-device storage for theme, “My reports,” and similar preferences.
        We do not use advertising cookies.{" "}
        <Link to="/cookies" className="font-semibold text-civic-accent hover:underline">
          Cookies & local storage
        </Link>
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-9 items-center rounded-full bg-civic-accent px-3.5 text-xs font-semibold text-white hover:bg-civic-accentDark"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
