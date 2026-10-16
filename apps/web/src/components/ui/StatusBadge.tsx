import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function CategoryIcon({
  category,
  className = "h-6 w-6",
}: {
  category: string;
  className?: string;
}) {
  switch (category) {
    case "MOBILITY_SURFACE_DAMAGE":
      return (
        <Icon className={className}>
          <path d="M3 19h18M5 19l4-9 3 5 3-7 4 11" />
        </Icon>
      );
    case "NMT_PEDESTRIAN_HAZARD":
      return (
        <Icon className={className}>
          <circle cx="12" cy="5" r="2" />
          <path d="M9 22l3-8 3 8M8 10h8l-2 4H10z" />
        </Icon>
      );
    case "DRAINAGE_STORMWATER":
      return (
        <Icon className={className}>
          <path d="M12 3c3 4 5 7 5 10a5 5 0 1 1-10 0c0-3 2-6 5-10z" />
        </Icon>
      );
    case "SEWER_SANITATION":
      return (
        <Icon className={className}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v2M12 18v2M4 12h2M18 12h2" />
        </Icon>
      );
    case "LIGHTING_SECURITY":
      return (
        <Icon className={className}>
          <path d="M9 18h6M10 21h4" />
          <path d="M8 10a4 4 0 1 1 8 0c0 2-1.5 3-2 4H10c-.5-1-2-2-2-4z" />
        </Icon>
      );
    default:
      return (
        <Icon className={className}>
          <path d="M7 20V10l5-6 5 6v10" />
          <path d="M10 20v-5h4v5" />
        </Icon>
      );
  }
}

export function StatusBadge({
  verified,
  size = "md",
}: {
  verified: boolean;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";
  if (verified) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-civic-verifiedBg font-semibold text-civic-verified ${pad}`}
      >
        <CheckIcon />
        Community verified
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-civic-pendingBg font-semibold text-civic-pending ${pad}`}
    >
      <ClockIcon />
      Pending confirmation
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 3.8V6l1.7 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
