import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { UrbanMeshLogo } from "../ui/UrbanMeshLogo";
import { useLocationState } from "../../lib/location";
import { ThemeToggle } from "../../lib/theme";
import { InstallButton } from "../../lib/install";
import { useOnline } from "../../lib/online";
import { useNotices } from "../../lib/useNotices";
import { NoticeBell, NotificationsPane } from "./NotificationsPane";
import { ButtonLink } from "../ui/Button";

const NAV = [
  { to: "/", label: "Map", end: true },
  { to: "/reports", label: "Reports" },
  { to: "/me", label: "My Reports" },
] as const;

/** Top clearance for the floating pill over page content (non–full-bleed). */
export const NAV_PILL_OFFSET =
  "pt-[max(4.75rem,calc(3.75rem+env(safe-area-inset-top)))] md:pt-[max(5.25rem,calc(4.25rem+env(safe-area-inset-top)))]";

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
    <div className="relative flex h-full max-h-full w-full flex-col overflow-hidden bg-civic-paper">
      {!online ? (
        <p
          role="status"
          className="relative z-[2100] shrink-0 bg-civic-pendingBg px-4 py-2 text-center text-xs font-semibold text-civic-pending"
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
          fullBleed ? "overflow-hidden" : `um-scroll ${NAV_PILL_OFFSET}`
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
    ? `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[11px] font-semibold transition-colors ${
        isActive ? "bg-civic-mist text-civic-accent" : "text-civic-muted"
      }`
    : `rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        isActive
          ? "bg-civic-mist text-civic-ink"
          : "text-civic-slate hover:bg-civic-mist/70 hover:text-civic-ink"
      }`;
}

const toolBtn =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-transparent px-2.5 text-xs font-semibold text-civic-slate transition-colors hover:border-civic-line hover:bg-civic-mist/80";

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
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[2000] px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 lg:px-6">
      <div className="um-nav-pill pointer-events-auto mx-auto flex w-full max-w-5xl items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-2.5 lg:max-w-6xl">
        <Link to="/" aria-label="UrbanMesh home" className="shrink-0 rounded-full px-1.5 py-1">
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

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-1.5">
          <div className="hidden items-center gap-1 lg:flex">
            <InstallButton className={toolBtn} />
            <NoticeBell
              unreadCount={unreadCount}
              open={updatesOpen}
              onToggle={onToggleUpdates}
              className={toolBtn}
            />
            <NavLink
              to="/about"
              aria-label="About UrbanMesh"
              title="About"
              className={({ isActive }) =>
                `${toolBtn} ${isActive ? "border-civic-line bg-civic-mist text-civic-ink" : ""}`
              }
            >
              <AboutIcon />
              <span className="hidden xl:inline">About</span>
            </NavLink>
            <button
              type="button"
              onClick={requestLocation}
              aria-label={coords ? "Refresh location" : "Use current location"}
              className={toolBtn}
            >
              <LocateIcon />
              <span className="hidden xl:inline">
                {locating ? "Locating…" : coords ? "Located" : "Location"}
              </span>
            </button>
            <ThemeToggle className={toolBtn} />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <NoticeBell
              unreadCount={unreadCount}
              open={updatesOpen}
              onToggle={onToggleUpdates}
              className={toolBtn}
              compact
            />
            <ThemeToggle className={toolBtn} compact />
          </div>

          <ButtonLink
            to="/report"
            className="min-h-9 shrink-0 rounded-full px-3.5 text-xs shadow-none sm:px-4 sm:text-sm"
          >
            Report an issue
          </ButtonLink>
        </div>
      </div>
      {error ? (
        <p className="pointer-events-auto mx-auto mt-2 max-w-5xl rounded-full border border-civic-critical/30 bg-civic-criticalBg/95 px-4 py-2 text-center text-xs font-semibold text-civic-critical shadow-card backdrop-blur-md lg:max-w-6xl">
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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[2000] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="um-nav-pill pointer-events-auto mx-auto flex min-h-14 max-w-lg items-stretch gap-1 p-1.5">
        <NavLink to="/" end className={({ isActive }) => navClass(isActive, true)}>
          <MapIcon />
          Map
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => navClass(isActive, true)}>
          <ListIcon />
          Reports
        </NavLink>
        <NavLink to="/me" className={({ isActive }) => navClass(isActive, true)}>
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

function LocateIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
