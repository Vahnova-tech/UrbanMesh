export const DISPROVE_REASONS = [
  {
    id: "incorrect_location",
    label: "Incorrect or unverifiable location",
    requiresNote: false,
  },
  {
    id: "evidence_unsupported",
    label: "Evidence does not support the reported hazard",
    requiresNote: false,
  },
  {
    id: "duplicate",
    label: "Duplicate report",
    requiresNote: false,
  },
  {
    id: "out_of_scope",
    label: "Report is outside the supported reporting scope",
    requiresNote: false,
  },
  {
    id: "misleading",
    label: "Confirmed inaccurate or misleading submission",
    requiresNote: false,
  },
  {
    id: "other",
    label: "Other — requires a written explanation",
    requiresNote: true,
  },
] as const;

export type DisproveReasonId = (typeof DISPROVE_REASONS)[number]["id"];

export function resolveDisproveReason(
  reasonCode: string | null | undefined,
  note: string | null | undefined,
): { code: DisproveReasonId; label: string; auditReason: string } {
  const code = (reasonCode?.trim() || "") as DisproveReasonId;
  const match = DISPROVE_REASONS.find((r) => r.id === code);
  if (!match) {
    throw new Error("Select a valid disprove reason.");
  }
  const trimmedNote = note?.trim() ?? "";
  if (match.requiresNote && trimmedNote.length < 3) {
    throw new Error("A written explanation is required for this reason.");
  }
  const auditReason = trimmedNote
    ? `${match.label} — ${trimmedNote}`
    : match.label;
  return { code: match.id, label: match.label, auditReason };
}
