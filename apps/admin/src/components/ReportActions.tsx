import { useState } from "react";
import {
  runAdminAction,
  type AdminAction,
  type AdminIncident,
  type ReviewStatus,
} from "../lib/api";
import { HAZARD_CATEGORIES } from "../lib/categories";
import { ActionDialog } from "./ActionDialog";

type DialogKind =
  | "approve_field"
  | "reject"
  | "flag"
  | "resolve"
  | "reopen"
  | "archive"
  | "restore"
  | "merge_duplicate"
  | "reset_queue"
  | "edit_category"
  | null;

const DIALOG_META: Record<
  Exclude<DialogKind, null>,
  {
    title: string;
    description: string;
    confirmLabel: string;
    requireReason: boolean;
    destructive?: boolean;
    reasonLabel?: string;
    reasonPlaceholder?: string;
  }
> = {
  approve_field: {
    title: "Verify in field",
    description:
      "Record that an actual inspection confirmed this hazard. This is separate from community spatial corroboration.",
    confirmLabel: "Mark field-verified",
    requireReason: false,
    reasonLabel: "Inspection note (optional)",
    reasonPlaceholder: "What was observed on site…",
  },
  reject: {
    title: "Reject report",
    description:
      "Unsupported or invalid reports are removed from the public map. A reason is required and logged.",
    confirmLabel: "Reject report",
    requireReason: true,
    destructive: true,
    reasonPlaceholder: "Why this report is unsupported…",
  },
  flag: {
    title: "Flag for review",
    description: "Send this submission to the moderation queue for further investigation.",
    confirmLabel: "Flag report",
    requireReason: true,
    reasonPlaceholder: "What looks suspicious…",
  },
  resolve: {
    title: "Mark resolved",
    description:
      "Record that the issue is resolved, with supporting notes. Attach follow-up evidence in the note when available.",
    confirmLabel: "Mark resolved",
    requireReason: true,
    reasonLabel: "Resolution note",
    reasonPlaceholder: "How it was resolved and supporting evidence…",
  },
  reopen: {
    title: "Reopen report",
    description: "Return a resolved hazard to the review queue (e.g. recurring issue).",
    confirmLabel: "Reopen",
    requireReason: false,
    reasonPlaceholder: "Why this is being reopened…",
  },
  archive: {
    title: "Archive report",
    description: "Hide from active queues while keeping history. Reason is required.",
    confirmLabel: "Archive",
    requireReason: true,
    destructive: true,
  },
  restore: {
    title: "Restore to queue",
    description: "Return an archived or rejected report to pending review.",
    confirmLabel: "Restore",
    requireReason: false,
  },
  merge_duplicate: {
    title: "Resolve duplicate",
    description:
      "Link this report to a primary record without losing history. The duplicate is archived.",
    confirmLabel: "Merge duplicate",
    requireReason: true,
    reasonPlaceholder: "How you confirmed these are the same hazard…",
  },
  reset_queue: {
    title: "Reset to queue",
    description:
      "Clear field-verification and resolution marks and return this report to pending. Use only to correct mistakes — history is logged.",
    confirmLabel: "Reset",
    requireReason: false,
    destructive: true,
  },
  edit_category: {
    title: "Edit category",
    description: "Correct permitted category metadata. Reason is required and audited.",
    confirmLabel: "Save category",
    requireReason: true,
    reasonPlaceholder: "Why the category is changing…",
  },
};

export function ReportActions({
  incident,
  nearbyIds = [],
  onDone,
  onError,
  compact = false,
}: {
  incident: AdminIncident;
  nearbyIds?: string[];
  onDone: () => void | Promise<void>;
  onError: (message: string) => void;
  compact?: boolean;
}) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState(nearbyIds[0] ?? "");
  const [category, setCategory] = useState(incident.category);

  const status = incident.review_status;

  async function confirm(kind: Exclude<DialogKind, null>, reason: string) {
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (reason) {
        body.reason = reason;
        body.note = reason;
      }
      if (kind === "merge_duplicate") {
        if (!duplicateOf.trim()) {
          onError("Pick a primary report to merge into.");
          return;
        }
        body.duplicate_of_id = duplicateOf.trim();
      }
      if (kind === "edit_category") {
        body.category = category;
      }
      await runAdminAction(incident.id, kind as AdminAction, body);
      setDialog(null);
      await onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "inline-flex min-h-10 items-center justify-center rounded-card border px-3 text-xs font-semibold disabled:opacity-60";
  const primary = `${btn} border-transparent bg-civic-accent text-white hover:bg-civic-accentDark`;
  const secondary = `${btn} border-civic-line text-civic-ink hover:bg-civic-mist`;
  const danger = `${btn} border-civic-critical/30 bg-civic-criticalBg text-civic-critical hover:bg-civic-critical/10`;

  const meta = dialog ? DIALOG_META[dialog] : null;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
        {status !== "approved" && status !== "archived" ? (
          <button type="button" className={primary} onClick={() => setDialog("approve_field")}>
            Verify in field
          </button>
        ) : null}

        {status === "pending" || status === "approved" ? (
          <button type="button" className={secondary} onClick={() => setDialog("flag")}>
            Flag report
          </button>
        ) : null}

        {status !== "resolved" && status !== "archived" && status !== "rejected" ? (
          <button type="button" className={secondary} onClick={() => setDialog("resolve")}>
            Mark resolved
          </button>
        ) : null}

        {status === "resolved" ? (
          <button type="button" className={secondary} onClick={() => setDialog("reopen")}>
            Reopen
          </button>
        ) : null}

        {status !== "archived" && nearbyIds.length > 0 ? (
          <button
            type="button"
            className={secondary}
            onClick={() => {
              setDuplicateOf(nearbyIds[0] ?? "");
              setDialog("merge_duplicate");
            }}
          >
            Resolve duplicate
          </button>
        ) : null}

        <button
          type="button"
          className={secondary}
          onClick={() => {
            setCategory(incident.category);
            setDialog("edit_category");
          }}
        >
          Edit category
        </button>

        {status !== "rejected" && status !== "archived" ? (
          <button type="button" className={danger} onClick={() => setDialog("reject")}>
            Reject
          </button>
        ) : null}

        {status !== "archived" ? (
          <button type="button" className={danger} onClick={() => setDialog("archive")}>
            Archive
          </button>
        ) : null}

        {status === "archived" || status === "rejected" ? (
          <button type="button" className={secondary} onClick={() => setDialog("restore")}>
            Restore
          </button>
        ) : null}

        {canReset(status) ? (
          <button type="button" className={secondary} onClick={() => setDialog("reset_queue")}>
            Reset to queue
          </button>
        ) : null}
      </div>

      {meta && dialog ? (
        <ActionDialog
          open
          title={meta.title}
          description={meta.description}
          confirmLabel={meta.confirmLabel}
          requireReason={meta.requireReason}
          reasonLabel={meta.reasonLabel}
          reasonPlaceholder={meta.reasonPlaceholder}
          destructive={meta.destructive}
          busy={busy}
          onClose={() => !busy && setDialog(null)}
          onConfirm={(reason) => confirm(dialog, reason)}
          extra={
            dialog === "merge_duplicate" ? (
              <label className="mt-4 block text-xs font-semibold text-civic-slate">
                Primary report ID
                <input
                  value={duplicateOf}
                  onChange={(e) => setDuplicateOf(e.target.value)}
                  list="nearby-ids"
                  className="mt-1.5 w-full rounded-card border border-civic-line bg-civic-paper px-3 py-2 font-mono text-sm outline-none focus:border-civic-accent"
                  placeholder="UUID of the primary report"
                />
                <datalist id="nearby-ids">
                  {nearbyIds.map((id) => (
                    <option key={id} value={id} />
                  ))}
                </datalist>
              </label>
            ) : dialog === "edit_category" ? (
              <label className="mt-4 block text-xs font-semibold text-civic-slate">
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-card border border-civic-line bg-civic-paper px-3 py-2 text-sm outline-none focus:border-civic-accent"
                >
                  {HAZARD_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
        />
      ) : null}
    </>
  );
}

function canReset(status: ReviewStatus): boolean {
  return status !== "pending";
}
