import { useEffect, useState } from "react";
import { photoSrc } from "../../lib/api";
import { formatWhen } from "../../lib/format";

export type EvidenceImage = {
  id: string;
  url: string | null;
  label: string;
  submittedAt?: string;
  kind: "original" | "community";
};

export function EvidenceGallery({
  images,
  emptyFallback,
}: {
  images: EvidenceImage[];
  emptyFallback?: React.ReactNode;
}) {
  const usable = images.filter((img) => Boolean(photoSrc(img.url)));
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setActive(0);
    setFailed({});
  }, [images]);

  const visible = usable.filter((img) => !failed[img.id]);
  const current = visible[Math.min(active, Math.max(visible.length - 1, 0))];

  if (!current) {
    if (emptyFallback) return <>{emptyFallback}</>;
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center bg-civic-mist">
        <p className="px-4 text-center text-sm font-medium text-civic-muted">
          No photo evidence for this report.
        </p>
      </div>
    );
  }

  const src = photoSrc(current.url);

  return (
    <div className="flex h-full min-h-[12rem] flex-col bg-civic-ink/5">
      <div className="relative min-h-0 flex-1">
        <img
          src={src ?? undefined}
          alt={current.label}
          className="h-full max-h-[420px] w-full object-contain lg:max-h-none lg:object-cover"
          onError={() => setFailed((prev) => ({ ...prev, [current.id]: true }))}
        />
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-civic-surface/90 px-2 py-1 text-[11px] font-semibold text-civic-ink">
            {current.kind === "original" ? "Original evidence" : "Community contribution"}
          </span>
          {current.submittedAt ? (
            <span className="rounded-md bg-civic-surface/90 px-2 py-1 text-[11px] font-medium text-civic-muted">
              {formatWhen(current.submittedAt)}
            </span>
          ) : null}
        </div>
      </div>
      {visible.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-civic-line bg-civic-surface p-2">
          {visible.map((img, index) => {
            const thumb = photoSrc(img.url);
            if (!thumb) return null;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(index)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-[8px] border-2 ${
                  index === active ? "border-civic-accent" : "border-transparent"
                }`}
                aria-label={img.label}
                aria-pressed={index === active}
              >
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
