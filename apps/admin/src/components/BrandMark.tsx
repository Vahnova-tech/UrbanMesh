export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill="var(--civic-mist)" />
      <path
        d="M32 8 L52 19.5 V42.5 L32 54 L12 42.5 V19.5 Z"
        stroke="var(--civic-ink)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="var(--civic-paper)"
      />
      <path
        d="M22 25.5 L32 20 L42 25.5 V36.5 L32 42 L22 36.5 Z"
        stroke="var(--civic-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16.5 40.5 C22 34 28 28.5 32 27 C36.5 25.2 43 22 48.5 17.5"
        stroke="var(--civic-accent)"
        strokeWidth="3.1"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16.5" cy="40.5" r="2.8" fill="var(--civic-ink)" />
      <circle cx="48.5" cy="17.5" r="2.8" fill="var(--civic-ink)" />
    </svg>
  );
}
