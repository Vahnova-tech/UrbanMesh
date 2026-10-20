import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", end: true, label: "Dashboard" },
  { to: "/queue", end: false, label: "Review queue" },
  { to: "/map", end: false, label: "Map" },
] as const;

export function AdminShell({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-civic-line bg-civic-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div>
            <p className="um-eyebrow">UrbanMesh · Admin</p>
            <h1 className="text-lg font-semibold tracking-tight text-civic-ink">
              Field operations
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `min-h-9 rounded-full px-3.5 text-xs font-semibold ${
                    isActive
                      ? "bg-civic-accent text-white"
                      : "text-civic-slate hover:bg-civic-mist"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={onLogout}
              className="ml-1 min-h-9 rounded-full border border-civic-line px-3.5 text-xs font-semibold text-civic-muted hover:bg-civic-mist"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
