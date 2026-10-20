import { useEffect, useState } from "react";
import { photoSrc } from "../lib/api";

export function EvidencePhoto({
  url,
  className = "max-h-72 w-full rounded-card border border-civic-line object-cover",
}: {
  url: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : photoSrc(url);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!src) {
    return (
      <p className="rounded-card border border-dashed border-civic-line px-4 py-8 text-center text-sm text-civic-muted">
        {url ? "Photo unavailable (file missing on API storage)" : "No photo attached"}
      </p>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
