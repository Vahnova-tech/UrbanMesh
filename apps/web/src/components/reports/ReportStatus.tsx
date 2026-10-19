import {
  communityStatus,
  communityStatusHint,
  communityStatusLabel,
  type CommunityStatus,
} from "../../lib/reportStatus";

export function ReportStatusBadge({
  verified,
  size = "md",
}: {
  verified: boolean;
  size?: "sm" | "md";
}) {
  const status = communityStatus(verified);
  return <CommunityStatusBadge status={status} size={size} />;
}

export function CommunityStatusBadge({
  status,
  size = "md",
}: {
  status: CommunityStatus;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";
  if (status === "community_supported") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-civic-verifiedBg font-semibold text-civic-verified ${pad}`}
      >
        <CheckIcon />
        {communityStatusLabel(status)}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-civic-pendingBg font-semibold text-civic-pending ${pad}`}
    >
      <ClockIcon />
      {communityStatusLabel(status)}
    </span>
  );
}

export function ReportStatusCallout({ verified }: { verified: boolean }) {
  const status = communityStatus(verified);
  return (
    <div
      className={`rounded-card border px-3.5 py-3 ${
        status === "community_supported"
          ? "border-civic-verified/25 bg-civic-verifiedBg/60"
          : "border-civic-pending/25 bg-civic-pendingBg/60"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          status === "community_supported" ? "text-civic-verified" : "text-civic-pending"
        }`}
      >
        {communityStatusLabel(status)}
      </p>
      <p className="mt-1 text-xs leading-snug text-civic-slate">
        {communityStatusHint(status)}
      </p>
    </div>
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
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 3.8V6l1.6 1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
