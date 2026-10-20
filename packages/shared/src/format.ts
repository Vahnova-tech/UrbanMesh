export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Nairobi",
  });
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  });
}

export function formatDataAsOf(iso: string): string {
  return `Data as of ${formatWhen(iso)} EAT`;
}

export function shortTitle(description: string, fallback: string): string {
  const clean = description.trim();
  if (!clean) return fallback;
  const first = clean.split(/[.!?]/)[0] ?? clean;
  return first.length > 72 ? `${first.slice(0, 69).trim()}…` : first;
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export const MONTH_LABEL = new Date().toLocaleDateString("en-KE", {
  month: "long",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});
