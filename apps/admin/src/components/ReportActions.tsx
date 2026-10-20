import { useEffect, useState } from "react";
import {
  fetchDisproveReasons,
  runAdminAction,
  type AdminAction,
  type AdminIncident,
  type DisproveReason,
  type ReviewStatus,
} from "../lib/api";
import { HAZARD_CATEGORIES } from "../lib/categories";
import { ActionDialog } from "./ActionDialog";

type DialogKind =
  | "approve_field"
  | "disprove"
  | "flag"
  | "under_review"
  | "resolve"
  | "reopen"
  | "delete"
  | "restore"
  | "merge_duplicate"
  | "reset_queue"
  | "edit_category"
  | null;

function normalizeStatus(raw: string | undefined | null): ReviewStatus {
  const value = String(raw ?? "pending").toLowerCase() as ReviewStatus;
  const allowed: ReviewStatus[] = [
    "pending",
    "approved",
    "rejected",
    "flagged",
    "resolved",
    "archived",
    "disproved",
    "under_review",
  ];
  return allowed.includes(value) ? value : "pending";
}

export function ReportActions({
  incident,
  nearbyIds = [],
  onDone,
  onError,
}: {
  incident: AdminIncident;
  nearbyIds?: string[];
  onDone: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState(nearbyIds[0] ?? "");
  const [category, setCategory] = useState(incident.category);
  const [reasons, setReasons] = useState<DisproveReason[]>([]);
  const [reasonCode, setReasonCode] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = normalizeStatus(incident.review_status);
  const active =
    status !== "archived" && status !== "disproved" && status !== "rejected";

  useEffect(() => {
    void fetchDisproveReasons()
      .then(setReasons)
      .catch(() => setReasons([]));
  }, []);

  async function confirm(kind: Exclude<DialogKind, null>, reason: string) {
    if (kind === "delete" && !confirmDelete) {
      onError("Confirm deletion by checking the box.");
      return;
    }
    if (kind === "disprove") {
      const selected = reasons.find((r) => r.id === reasonCode);
      if (!selected) {
        onError("Select a disprove reason.");
        return;
      }
      if (selected.requiresNote && reason.trim().length < 3) {
        onError("A written explanation is required for this reason.");
        return;
      }
    }

    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (reason) {
        body.reason = reason;
        body.note = reason;
      }
      if (kind === "disprove") {
        body.reason_code = reasonCode;
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

      const action: AdminAction =
        kind === "delete" ? "delete" : (kind as AdminAction);
      await runAdminAction(incident.id, action, body);
      setDialog(null);
      setConfirmDelete(false);
      setReasonCode("");
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
  const secondary = `${btn} border-civic-line bg-civic-surface text-civic-ink hover:bg-civic-mist`;
  const danger = `${btn} border-civic-critical/40 bg-civic-criticalBg text-civic-critical hover:bg-civic-critical/15`;

  return (
    <>
      <div className="rounded-card border border-civic-line bg-civic-mist/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-civic-muted">
          Report actions
        </p>
        <div className="flex flex-wrap gap-2">
          {active && status !== "under_review" ? (
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => setDialog("under_review")}
            >
              Mark under review
            </button>
          ) : null}

          {active && status !== "approved" ? (
            <button
              type="button"
              disabled={busy}
              className={primary}
              onClick={() => setDialog("approve_field")}
            >
              Record field inspection
            </button>
          ) : null}

          {active ? (
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => setDialog("flag")}
            >
              Flag report
            </button>
          ) : null}

          {active && status !== "resolved" ? (
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => setDialog("resolve")}
            >
              Mark resolved
            </button>
          ) : null}

          {status === "resolved" ? (
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => setDialog("reopen")}
            >
              Reopen
            </button>
          ) : null}

          {active ? (
            <button
              type="button"
              disabled={busy}
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
            disabled={busy}
            className={secondary}
            onClick={() => {
              setCategory(incident.category);
              setDialog("edit_category");
            }}
          >
            Edit category
          </button>

          {active ? (
            <button
              type="button"
              disabled={busy}
              className={danger}
              onClick={() => {
                setReasonCode("");
                setDialog("disprove");
              }}
            >
              Disprove report
            </button>
          ) : null}

          {status !== "archived" ? (
            <button
              type="button"
              disabled={busy}
              className={danger}
              onClick={() => {
                setConfirmDelete(false);
                setDialog("delete");
              }}
            >
              Delete report
            </button>
          ) : null}

          {status === "archived" ||
          status === "disproved" ||
          status === "rejected" ? (
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => setDialog("restore")}
            >
              Restore
            </button>
          ) : null}

          {status !== "pending" ? (
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => setDialog("reset_queue")}
            >
              Reset to queue
            </button>
          ) : null}
        </div>
      </div>

      <ActionDialog
        open={dialog === "approve_field"}
        title="Record field inspection"
        description="Confirms an actual on-site inspection. This does not invent verification and is separate from community spatial corroboration."
        confirmLabel="Mark field-verified"
        requireReason={false}
        reasonLabel="Inspection note"
        reasonPlaceholder="What was observed on site…"
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("approve_field", reason)}
      />

      <ActionDialog
        open={dialog === "disprove"}
        title="Disprove report"
        description="Marks the claim as disproved and excludes it from confirmed-hazard maps, clustering, and corroboration. Evidence is retained for audit. Lack of corroboration alone is not a reason to disprove."
        confirmLabel="Disprove report"
        requireReason={
          reasons.find((r) => r.id === reasonCode)?.requiresNote ?? false
        }
        reasonLabel="Explanatory note"
        reasonPlaceholder="Additional context…"
        destructive
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("disprove", reason)}
        extra={
          <label className="mt-4 block text-xs font-semibold text-civic-slate">
            Disprove reason
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="mt-1.5 w-full rounded-card border border-civic-line bg-civic-paper px-3 py-2 text-sm outline-none focus:border-civic-accent"
            >
              <option value="">Select a reason…</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <ActionDialog
        open={dialog === "delete"}
        title="Delete report"
        description={`Soft-deletes report ${incident.id.slice(0, 8).toUpperCase()} (“${incident.description.slice(0, 80)}${incident.description.length > 80 ? "…" : ""}”). The record is archived, removed from public views, and can be restored. This is not the same as disproving a claim.`}
        confirmLabel="Delete (archive)"
        requireReason
        reasonPlaceholder="Why this record is being deleted…"
        destructive
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("delete", reason)}
        extra={
          <label className="mt-4 flex items-start gap-2 text-xs text-civic-slate">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I understand this archives the report and removes it from public
              hazard views.
            </span>
          </label>
        }
      />

      <ActionDialog
        open={dialog === "flag"}
        title="Flag for review"
        description="Send this submission to the moderation queue."
        confirmLabel="Flag report"
        requireReason
        reasonPlaceholder="What looks suspicious…"
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("flag", reason)}
      />

      <ActionDialog
        open={dialog === "under_review"}
        title="Mark under review"
        description="Marks that an administrator is actively reviewing this report."
        confirmLabel="Mark under review"
        requireReason={false}
        reasonLabel="Note"
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("under_review", reason)}
      />

      <ActionDialog
        open={dialog === "resolve"}
        title="Mark resolved"
        description="Record that the issue is resolved, with supporting notes."
        confirmLabel="Mark resolved"
        requireReason
        reasonLabel="Resolution note"
        reasonPlaceholder="How it was resolved…"
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("resolve", reason)}
      />

      <ActionDialog
        open={dialog === "reopen"}
        title="Reopen report"
        description="Return a resolved hazard to the review queue."
        confirmLabel="Reopen"
        requireReason={false}
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("reopen", reason)}
      />

      <ActionDialog
        open={dialog === "restore"}
        title="Restore to queue"
        description="Return this report to pending review."
        confirmLabel="Restore"
        requireReason={false}
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("restore", reason)}
      />

      <ActionDialog
        open={dialog === "reset_queue"}
        title="Reset to queue"
        description="Clear field-verification and resolution marks. History is logged."
        confirmLabel="Reset"
        requireReason={false}
        destructive
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("reset_queue", reason)}
      />

      <ActionDialog
        open={dialog === "merge_duplicate"}
        title="Resolve duplicate"
        description="Link this report to a primary record. The duplicate is archived."
        confirmLabel="Merge duplicate"
        requireReason
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("merge_duplicate", reason)}
        extra={
          <label className="mt-4 block text-xs font-semibold text-civic-slate">
            Primary report ID
            <input
              value={duplicateOf}
              onChange={(e) => setDuplicateOf(e.target.value)}
              list="nearby-ids"
              className="mt-1.5 w-full rounded-card border border-civic-line bg-civic-paper px-3 py-2 font-mono text-sm outline-none focus:border-civic-accent"
            />
            <datalist id="nearby-ids">
              {nearbyIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </label>
        }
      />

      <ActionDialog
        open={dialog === "edit_category"}
        title="Edit category"
        description="Correct permitted category metadata. Reason is audited."
        confirmLabel="Save category"
        requireReason
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onConfirm={(reason) => confirm("edit_category", reason)}
        extra={
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
        }
      />
    </>
  );
}
