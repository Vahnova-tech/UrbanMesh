import { useEffect, type ReactNode } from "react";

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
        className="relative w-full rounded-t-[12px] border-t border-civic-line bg-civic-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-card"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-civic-line" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <h2 id="sheet-title" className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-xl border border-civic-line px-3 text-xs font-semibold text-civic-slate"
          >
            Close
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </aside>
    </div>
  );
}
