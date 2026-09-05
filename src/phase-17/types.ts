/** Phase 17 shared vocabulary: validating the first prospective discovery survivor. */

/** How a Lane 0 finding is classified against the repository's repair taxonomy. */
export const PHASE17_ISSUE_CLASSES = [
  "no-defect",
  "prose-only-clarification",
  "verifier-completion",
  "material-contract-change",
  "fatal-candidate-defect",
] as const;

export type Phase17IssueClass = (typeof PHASE17_ISSUE_CLASSES)[number];

/**
 * How much evidence a control actually carries.
 *
 * `vacuous` is the important value and the reason this type exists: a control whose failing branch
 * is unreachable reports "held" forever. That is `DEFECT-TAXONOMY.md` B5 (never-firing check) living
 * inside a B6 rig, which is the one place the repository has already been burned.
 */
export const PHASE17_CONTROL_STRENGTHS = ["real", "weak", "vacuous"] as const;
export type Phase17ControlStrength = (typeof PHASE17_CONTROL_STRENGTHS)[number];

export interface Phase17AuditFinding {
  readonly id: string;
  readonly area: "probe-procedure" | "reader-raised-risk" | "control-strength";
  readonly declared: string;
  readonly observed: string;
  readonly issueClass: Phase17IssueClass;
  readonly evidence: readonly string[];
  /** What would have to be true for this finding to be wrong. */
  readonly falsifier: string;
}

export interface Phase17FrozenInput {
  readonly name: string;
  readonly path: string;
  readonly registeredSha256: string;
  readonly observedSha256: string;
  readonly matches: boolean;
}
