import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-end lg:hidden">
      <button
        type="button"
        aria-label="Dismiss report details"
        className="absolute inset-0 bg-civic-ink/25"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="um-sheet relative w-full rounded-t-card border-t border-civic-line bg-civic-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-card"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-civic-line" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <h2 id="sheet-title" className="um-title text-base lg:text-base">
            {title}
          </h2>
          <Button variant="secondary" onClick={onClose} className="min-h-11 px-3 text-xs">
            Close
          </Button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
      </aside>
    </div>
  );
}
