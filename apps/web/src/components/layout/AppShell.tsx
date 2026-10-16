import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { UrbanMeshLogo } from "../ui/UrbanMeshLogo";
import { useLocationState } from "../../lib/location";
import { ThemeToggle } from "../../lib/theme";
import { InstallButton } from "../../lib/install";
import { useOnline } from "../../lib/online";
import { useNotices } from "../../lib/useNotices";
import { NoticeBell, NotificationsPane } from "./NotificationsPane";

const NAV = [
  { to: "/", label: "Map", end: true },
  { to: "/reports", label: "Reports" },
  { to: "/me", label: "My Reports" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const fullBleed = pathname === "/" || pathname.startsWith("/hazards/");
  const online = useOnline();
  const notices = useNotices();
  const [updatesOpen, setUpdatesOpen] = useState(false);

  useEffect(() => {
    setUpdatesOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-full max-h-full w-full flex-col overflow-hidden bg-civic-paper">
      {!online ? (
        <p
          role="status"
          className="shrink-0 bg-civic-pendingBg px-4 py-2 text-center text-xs font-semibold text-civic-pending"
        >
          You are offline. Reports already on this phone remain visible.
        </p>
      ) : null}
      <TopBar
        unreadCount={notices.unreadCount}
        updatesOpen={updatesOpen}
        onToggleUpdates={() => setUpdatesOpen((open) => !open)}
      />
      <main
        className={`relative min-h-0 flex-1 ${
          fullBleed ? "overflow-hidden" : "um-scroll"
        }`}
      >
        {children}
      </main>
      <BottomNav />
      <NotificationsPane
        open={updatesOpen}
        onClose={() => setUpdatesOpen(false)}
        notices={notices.notices}
        readIds={notices.readIds}
        unreadCount={notices.unreadCount}
        loading={notices.loading}
        error={notices.error}
        onRetry={notices.retry}
        onRead={notices.markRead}
        onReadAll={notices.markAllRead}
      />
    </div>
  );
}

function navClass(isActive: boolean, compact = false) {
  return compact
    ? `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold ${
        isActive ? "text-civic-accent" : "text-civic-muted"
      }`
    : `rounded-[10px] px-3 py-2 text-sm font-semibold ${
        isActive ? "bg-civic-mist text-civic-ink" : "text-civic-slate hover:bg-civic-paper"
      }`;
}

function TopBar({
  unreadCount,
  updatesOpen,
  onToggleUpdates,
}: {
  unreadCount: number;
  updatesOpen: boolean;
  onToggleUpdates: () => void;
}) {
  const { requestLocation, locating, coords, error } = useLocationState();

  return (
    <header className="relative z-[2000] shrink-0 border-b border-civic-line bg-civic-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-4 py-2.5 lg:px-6">
        <Link to="/" aria-label="UrbanMesh home" className="shrink-0">
          <UrbanMeshLogo compact />
        </Link>
        <nav aria-label="Primary" className="hidden min-w-0 flex-1 items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) => navClass(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <InstallButton />
          <NoticeBell
            unreadCount={unreadCount}
            open={updatesOpen}
            onToggle={onToggleUpdates}
          />
          <NavLink
            to="/about"
            aria-label="About UrbanMesh"
            title="About"
            className={({ isActive }) =>
              `inline-flex h-11 w-11 items-center justify-center rounded-xl border border-civic-line ${
                isActive ? "bg-civic-mist text-civic-ink" : "text-civic-slate"
              }`
            }
          >
            <AboutIcon />
          </NavLink>
          <button
            type="button"
            onClick={requestLocation}
            aria-label={coords ? "Refresh location" : "Use current location"}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-civic-line px-3 text-xs font-semibold text-civic-slate"
          >
            <span className="md:hidden">{locating ? "…" : coords ? "Located" : "Locate"}</span>
            <span className="hidden md:inline">
              {locating ? "Locating…" : coords ? "Kilimani · Located" : "Location"}
            </span>
          </button>
          <ThemeToggle />
        </div>
      </div>
      {error ? (
        <p className="border-t border-civic-line px-4 py-2 text-xs font-semibold text-civic-critical lg:px-6">
          {error}
        </p>
      ) : null}
    </header>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Mobile"
      className="relative z-[2000] shrink-0 border-t border-civic-line bg-civic-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex min-h-14">
        <NavLink
          to="/"
          end
          className={({ isActive }) => navClass(isActive, true)}
        >
          <MapIcon />
          Map
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) => navClass(isActive, true)}
        >
          <ListIcon />
          Reports
        </NavLink>
        <NavLink
          to="/me"
          className={({ isActive }) => navClass(isActive, true)}
        >
          <UserIcon />
          My Reports
        </NavLink>
      </div>
    </nav>
  );
}

function MapIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13L15.5 6.5 9 4.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 4.5v13M15.5 6.5v13" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M5 12h14M5 17h10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 11.2V16.5M12 8.2v.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}