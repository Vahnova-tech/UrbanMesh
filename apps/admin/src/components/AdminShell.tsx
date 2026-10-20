import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "../lib/theme";

const NAV: { to: string; label: string; end?: boolean; section?: string }[] = [
  { to: "/", label: "Overview", end: true, section: "Operate" },
  { to: "/map", label: "Reports map" },
  { to: "/queue", label: "Review queue" },
  { to: "/reports", label: "All reports", end: true },
  { to: "/reports/disproved", label: "Disproved reports", end: true },
  { to: "/reports/archived", label: "Deleted / archived", end: true },
  { to: "/reports/resolved", label: "Resolved issues", end: true },
  { to: "/analytics", label: "Analytics", section: "Insights" },
  { to: "/pdf", label: "PDF reports" },
  { to: "/audit", label: "Audit logs", section: "Admin" },
  { to: "/users", label: "Users & roles" },
  { to: "/settings", label: "Settings" },
];

export function AdminShell({
  onLogout,
  pendingCount = 0,
}: {
  onLogout: () => void;
  pendingCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const width = collapsed ? "w-[4.5rem]" : "w-60";

  function NavItems({ onNavigate }: { onNavigate?: () => void }) {
    let lastSection = "";
    return (
      <nav className="flex flex-col gap-0.5 px-2 py-3" aria-label="Admin">
        {NAV.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          return (
            <div key={item.to}>
              {showSection && !collapsed ? (
                <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-civic-muted first:mt-0">
                  {item.section}
                </p>
              ) : null}
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-2 rounded-card px-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-civic-accent text-white"
                      : "text-civic-slate hover:bg-civic-mist"
                  }`
                }
                title={item.label}
              >
                <span className={collapsed ? "sr-only" : "truncate"}>
                  {item.label}
                </span>
                {collapsed ? (
                  <span className="mx-auto text-xs font-semibold">
                    {item.label.slice(0, 1)}
                  </span>
                ) : null}
                {!collapsed && item.to === "/queue" && pendingCount > 0 ? (
                  <span className="ml-auto rounded-md bg-white/20 px-1.5 text-[10px] font-semibold tabular-nums">
                    {pendingCount}
                  </span>
                ) : null}
              </NavLink>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-civic-paper">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-civic-line bg-civic-surface md:flex ${width}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-civic-line px-3 py-3">
          {!collapsed ? (
            <div className="min-w-0">
              <p className="um-eyebrow">UrbanMesh</p>
              <p className="truncate text-sm font-semibold text-civic-ink">Admin</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="min-h-9 min-w-9 rounded-card border border-civic-line text-xs font-semibold text-civic-slate hover:bg-civic-mist"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavItems />
        </div>
        <div className="space-y-2 border-t border-civic-line p-2">
          <ThemeToggle
            compact={collapsed}
            className="w-full justify-center"
          />
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-10 w-full items-center justify-center rounded-card border border-civic-line text-xs font-semibold text-civic-muted hover:bg-civic-mist"
          >
            {collapsed ? "Out" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-civic-surface shadow-card">
            <div className="border-b border-civic-line px-4 py-3">
              <p className="um-eyebrow">UrbanMesh</p>
              <p className="text-sm font-semibold text-civic-ink">Admin</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavItems onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-civic-line bg-civic-surface px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-10 rounded-card border border-civic-line px-3 text-xs font-semibold"
          >
            Menu
          </button>
          <div>
            <p className="um-eyebrow">UrbanMesh</p>
            <p className="text-sm font-semibold">Admin</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={onLogout}
              className="min-h-10 rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-muted"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
