import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "../../lib/theme";
import { PlannerUpdates } from "./NotificationsPane";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/map", label: "Live Map" },
  { to: "/reports", label: "Reports" },
  { to: "/clusters", label: "Verified Clusters" },
  { to: "/analytics", label: "Analytics" },
  { to: "/evidence", label: "LPDP Evidence" },
  { to: "/briefs", label: "Policy Briefs" },
  { to: "/settings", label: "Settings" },
];

export function PlannerShell() {
  return (
    <div className="flex min-h-dvh bg-civic-paper">
      <aside className="hidden w-60 shrink-0 border-r border-civic-line bg-civic-surface lg:flex lg:flex-col">
        <div className="border-b border-civic-line px-5 py-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold tracking-tight">UrbanMesh</p>
              <p className="mt-1 text-xs font-medium text-civic-muted">
                Kilimani County Console
              </p>
            </div>
            <PlannerUpdates />
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Planning area</span>
            <select
              defaultValue="kilimani"
              className="w-full rounded-[10px] border border-civic-line bg-civic-paper px-2 py-1.5 text-xs font-semibold text-civic-ink"
            >
              <option value="kilimani">Kilimani · Nairobi City County</option>
              <option value="westlands" disabled>
                Westlands — later
              </option>
              <option value="dagoretti" disabled>
                Dagoretti North — later
              </option>
            </select>
          </label>
        </div>
        <nav aria-label="County console" className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-[10px] px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-civic-mist text-civic-ink"
                    : "text-civic-slate hover:bg-civic-paper"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <p className="text-[11px] text-civic-muted">
            Nairobi City County · LPDP desk
          </p>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-civic-line bg-civic-surface px-3 py-2 lg:hidden">
          <PlannerUpdates />
          <ThemeToggle />
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isActive ? "bg-civic-ink text-civic-paper" : "bg-civic-mist text-civic-slate"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
