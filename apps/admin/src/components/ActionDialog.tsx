import { useEffect, useId, useState, type FormEvent } from "react";

export function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  requireReason = true,
  reasonLabel = "Reason",
  reasonPlaceholder = "Explain why…",
  destructive = false,
  busy = false,
  extra,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  destructive?: boolean;
  busy?: boolean;
  extra?: React.ReactNode;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const trimmed = reason.trim();
    if (requireReason && trimmed.length < 3) {
      setError("Enter a reason (at least 3 characters).");
      return;
    }
    setError(null);
    await onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-md rounded-card border border-civic-line bg-civic-surface p-5 shadow-card"
      >
        <h2 id={titleId} className="text-lg font-semibold text-civic-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-civic-slate">
            {description}
          </p>
        ) : null}

        {extra}

        <label className="mt-4 block text-xs font-semibold text-civic-slate">
          {requireReason ? reasonLabel : `${reasonLabel} (optional)`}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            className="mt-1.5 w-full rounded-card border border-civic-line bg-civic-paper px-3 py-2 text-sm text-civic-ink outline-none focus:border-civic-accent"
            placeholder={reasonPlaceholder}
          />
        </label>

        {error ? (
          <p className="mt-2 text-xs font-medium text-civic-critical">{error}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-10 rounded-card border border-civic-line px-4 text-sm font-semibold text-civic-ink hover:bg-civic-mist disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`min-h-10 rounded-card px-4 text-sm font-semibold text-white disabled:opacity-60 ${
              destructive
                ? "bg-civic-critical hover:bg-civic-critical/90"
                : "bg-civic-accent hover:bg-civic-accentDark"
            }`}
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
