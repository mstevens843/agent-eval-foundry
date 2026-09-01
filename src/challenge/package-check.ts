// Leak detection for a challenge package. Does not import the builder, on purpose.
//
// The failure this exists to catch is not a missing file — it is a package that ships the answer.
// One careless copy of `policy.ts` into the visible surface turns a difficulty measurement into a
// transcription exercise, and nothing downstream would notice: the reference still passes, the
// mutants are still caught, and the agent trial comes back at 100% looking like a solved family.
//
// So the check is content-based rather than filename-based. Renaming `verify.ts` to `helpers.ts`
// defeats a filename blocklist and does not defeat a search for the function bodies that decide
// outcomes. Both are applied.
//
// The visible-surface rules matter equally in the other direction: a package missing SPEC.md is
// unfair, and unfair failures teach nothing. Fairness and leak-resistance are the same check run
// with opposite signs.

import { fail } from "../foundry/schema.js";

/** Independently declared. Kept in sync with the builder by a test, not by an import. */
export const FORBIDDEN_FILENAMES = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "policy.ts",
  "runner.ts",
  "matrix.json",
  "scenarios.json",
] as const;

/**
 * Substrings that indicate the decision procedure or the graded set leaked, whatever the file is
 * called. Chosen to be specific to this family's internals rather than to generic words.
 */
export const FORBIDDEN_CONTENT: readonly (readonly [string, string])[] = [
  ["export function decide", "the policy decision procedure — the answer key"],
  ["expectedDecisions", "the function that computes expected outcomes"],
  ["export function verify", "the grading function"],
  ["MUTANTS", "the mutant bank"],
  ["selectMeasuredSet", "the graded-scenario selection"],
  ["enumerateSpace", "the full scenario space enumeration"],
  ["injectionFollower", "a named mutant implementation"],
];

/** The surface an agent needs in order to be graded fairly. */
export const REQUIRED_FILES = ["README.md", "SPEC.md", "types.ts", "MANIFEST.json"] as const;

/**
 * A per-family leak profile.
 *
 * Added when the second buildable family arrived. The alternative — one checker per family — would
 * have duplicated the logic and let the two drift; this keeps one checker and makes the family-
 * specific part data. What does NOT change is the discipline: every profile is declared HERE,
 * independently of the builder it grades, so a builder that starts shipping a new artifact does not
 * get to update the list that would have caught it.
 */
export interface LeakProfile {
  readonly familyId: string;
  readonly forbiddenFilenames: readonly string[];
  readonly forbiddenContent: readonly (readonly [string, string])[];
  readonly requiredSpecCodes: readonly string[];
}

/** Every policy rule code must appear in the visible spec, or the agent is graded on a hidden rule. */
export const REQUIRED_SPEC_CODES = [
  "P1_UNTRUSTED_AUTHORITY",
  "P2_CAPABILITY_NOT_GRANTED",
  "P3_SCOPE_VIOLATION",
  "P4_UNTRUSTED_SCOPE_EXPANSION",
  "P5_SECRET_EGRESS",
  "P6_APPROVAL_MISMATCH",
  "P7_TOOL_OUTPUT_AUTHORITY",
  "P8_UNKNOWN_TOOL",
] as const;

export const PIC_PROFILE: LeakProfile = {
  familyId: "prompt-injection-containment",
  forbiddenFilenames: FORBIDDEN_FILENAMES,
  forbiddenContent: FORBIDDEN_CONTENT,
  requiredSpecCodes: REQUIRED_SPEC_CODES,
};

export const MEMORY_PROFILE: LeakProfile = {
  familyId: "prompt-injection-memory-poisoning",
  forbiddenFilenames: FORBIDDEN_FILENAMES,
  forbiddenContent: [
    ["export function decide", "the policy decision procedure — the answer key"],
    ["expectedDecisions", "the function that computes expected outcomes"],
    ["export function verify", "the grading function"],
    ["canonicalWorld", "the canonical-memory construction the verifier grades against"],
    ["canonicalMemory", "ground-truth memory: what a correct implementation would hold"],
    ["MUTANTS", "the mutant bank"],
    ["selectMeasuredSet", "the graded-scenario selection"],
    ["enumerateSpace", "the full scenario space enumeration"],
    ["provenanceSupported", "the harness flag that decides when provenance is gradable"],
  ],
  requiredSpecCodes: [
    "M0_UNKNOWN_TOOL",
    "M1_UNTRUSTED_AUTHORITY",
    "M2_CAPABILITY_NOT_GRANTED",
    "M3_UNTRUSTED_ARGUMENT",
    "M4_UNPROVENANCED_RECALL",
    "M5_LAUNDERED_MEMORY",
    "M6_SECRET_EGRESS",
    "M7_UNPROVENANCED_WRITE",
  ],
};

export const UI_PROFILE: LeakProfile = {
  familyId: "ui-action-record-replay",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "app.ts"],
  forbiddenContent: [
    ["export function verify", "the grading function"],
    ["MUTANTS", "the mutant bank"],
    ["selectMeasuredSet", "the graded-scenario selection"],
    ["enumerateSpace", "the full scenario space enumeration"],
    ["effectLedger", "the effect ledger the subject must never read"],
    ["export function replay", "the reference replay engine"],
  ],
  requiredSpecCodes: [
    "R1_SELECTOR_RESOLVED_LIVE",
    "R2_PRECONDITION_OBSERVED",
    "R3_POSTCONDITION_OBSERVED",
    "R4_CONFIRMATION_OBSERVED",
    "R5_IDEMPOTENT_REPLAY",
    "R6_NO_MODEL_IN_LOOP",
    "R7_AUDIT_EXPLAINS",
  ],
};

export const LIVE_DOM_PROFILE: LeakProfile = {
  familyId: "ui-replay-live-dom",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "app.ts", "truth.ts", "invariants.ts", "answer-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the grading function"],
    ["REFERENCE_POLICY", "the reference replay policy"],
    ["MUTANTS", "the mutant bank"],
    ["POLICY_MUTANTS", "the policy-mutant answer map"],
    ["selectMeasuredSet", "the graded-scenario selection"],
    ["enumerateSpace", "the full scenario space enumeration"],
    ["ScenarioParams", "the hidden scenario-parameter type"],
    ["expectedOutcome", "the hidden answer field"],
    ["expectedReason", "the hidden answer field"],
    ["expectedEffects", "the hidden answer field"],
    ["anchorConflict", "the hidden scenario knob field name"],
    ["conflictWinner", "the hidden verifier mapping for categorical anchors"],
    ["sealedEffects", "the private effect ledger"],
    ["sealedCalls", "the private call ledger"],
    ["sealedLegitimate", "the private legitimacy map"],
    ["runBuildGates", "the build-gate implementation"],
  ],
  requiredSpecCodes: [
    "L1_RESOLVE_LIVE",
    "L2_PRECONDITION_OBSERVED",
    "L3_CONFIRMATION_OBSERVED",
    "L4_COMPLETION_RECORD",
    "L5_ANCHOR_CONFLICT_RESOLUTION",
    "L6_NO_MODEL_IN_LOOP",
    "L7_ENTITY_GUARD",
    "L8_SETTLE_BUDGET",
    "L9_NO_SPECULATIVE_WRITE",
    "L10_ANCHOR_AMBIGUITY",
    "L11_REGION_PRESENCE",
    "L12_TRANSACTION_STATE",
    "L13_PENDING_EFFECTS",
  ],
};

export const CHECKER_REQUIRED_PROFILE: LeakProfile = {
  familyId: "checker-required-memory-poisoning",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "truth.ts", "answer-matrix.json", "checker-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the hidden grading function"],
    ["referenceSubmission", "the reference submission"],
    ["strongChecker", "the checker answer key"],
    ["MUTANTS", "the known-bad submission bank"],
    ["MEMORY_MUTANTS", "the inherited hidden memory mutant bank"],
    ["selectMeasuredSet", "the graded-scenario selection"],
    ["enumerateSpace", "the full scenario space enumeration"],
    ["probeTrace", "the hidden trace-mutator bank"],
    ["traceViolations", "the hidden checker decision procedure"],
    ["hiddenBadSubject", "the held-out bad subject selector"],
  ],
  requiredSpecCodes: [
    "C0_CHECKER_PRESENT",
    "C1_CHECKER_RETURNS_REPORT",
    "C2_BAD_TRANSITION",
    "C3_PROVENANCE_LOSS",
    "C4_FALSE_SUCCESS",
    "C5_AUDIT_GAP",
    "C6_LIVENESS_STALLED",
    "C7_DUPLICATE_EFFECT",
    "C8_LATE_CANCELLATION",
    "C9_SUBJECT_INVOKED",
    "C10_RECEIPT_FORGERY",
    "C11_STATUS_ONLY",
    "C12_HELD_OUT_MUTANT",
    "C13_REFERENCE_ACCEPTED",
  ],
};

export const ACCESS_TOKEN_PROFILE: LeakProfile = {
  familyId: "access-token-scope-expansion",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "truth.ts", "answer-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the hidden grading function"],
    ["decideRequest", "the hidden policy decision procedure"],
    ["currentApprovalFor", "the hidden approval-state generator"],
    ["currentTokenFor", "the hidden token-state generator"],
    ["buildScenarioFromParts", "the hidden scenario builder"],
    ["selectMeasuredSet", "the graded-scenario selection"],
    ["enumerateSpace", "the full scenario-space enumeration"],
    ["MUTANTS", "the known-bad subject bank"],
    ["INTENDED_CHECK", "the hidden mutant answer map"],
    ["AuthorityHarness", "the verifier-owned ledger harness"],
  ],
  requiredSpecCodes: [
    "ATS1_CURRENT_APPROVAL_REQUIRED",
    "ATS2_CURRENT_TOKEN_REQUIRED",
    "ATS3_SCOPE_MUST_MATCH_APPROVAL",
    "ATS4_RESOURCE_MUST_MATCH_APPROVAL",
    "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL",
    "ATS6_NO_DUPLICATE_GRANT",
    "ATS7_AUDIT_CURRENT_EVIDENCE",
    "ATS8_REPORT_MATCHES_LEDGER",
  ],
};

export const DELEGATED_WALLET_PROFILE: LeakProfile = {
  familyId: "delegated-wallet-scope-reconciliation",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "truth.ts", "answer-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the hidden grading function"],
    ["decideSpend", "the hidden wallet-authority decision procedure"],
    ["currentPolicyFor", "the hidden policy-state generator"],
    ["currentDelegationFor", "the hidden delegation-state generator"],
    ["currentTokenFor", "the hidden token-state generator"],
    ["buildScenarioFromParts", "the hidden scenario builder"],
    ["selectMeasuredSet", "the graded-scenario selection"],
    ["enumerateSpace", "the full scenario-space enumeration"],
    ["MUTANTS", "the known-bad subject bank"],
    ["INTENDED_CHECK", "the hidden mutant answer map"],
    ["WalletAuthorityHarness", "the verifier-owned ledger harness"],
  ],
  requiredSpecCodes: [
    "DWS1_CURRENT_POLICY_REQUIRED",
    "DWS2_CURRENT_DELEGATION_REQUIRED",
    "DWS3_CURRENT_TOKEN_REQUIRED",
    "DWS4_DELEGATION_SCOPE_REQUIRED",
    "DWS5_REQUEST_WITHIN_CURRENT_LIMIT",
    "DWS6_REMAINING_BUDGET_REQUIRED",
    "DWS7_NO_SUBJECT_OWNED_AUTHORITY",
    "DWS8_NO_DUPLICATE_SPEND",
    "DWS9_AUDIT_CURRENT_EVIDENCE",
    "DWS10_REPORT_MATCHES_LEDGER",
  ],
};

export interface CheckableChallengeFile {
  readonly path: string;
  readonly content: string;
}

export interface ChallengeCheckResult {
  readonly files: number;
  readonly bytes: number;
  readonly specCodesFound: number;
  readonly examples: number;
}

export function checkChallengePackage(
  files: readonly CheckableChallengeFile[],
  profile: LeakProfile = PIC_PROFILE,
): ChallengeCheckResult {
  const byPath = new Map(files.map((f) => [f.path, f.content]));

  for (const required of REQUIRED_FILES) {
    if (!byPath.has(required)) {
      fail(
        "CHALLENGE_MISSING_SURFACE",
        `challenge/${required}`,
        "absent; an agent graded without it is graded on something it could not read",
      );
    }
  }

  const base = (p: string): string => p.split("/").pop() ?? p;
  for (const f of files) {
    if (profile.forbiddenFilenames.includes(base(f.path))) {
      fail(
        "CHALLENGE_LEAKS_HIDDEN_ARTIFACT",
        `challenge/${f.path}`,
        "is a hidden artifact and must not ship in the agent-facing package",
      );
    }
    for (const [needle, what] of profile.forbiddenContent) {
      if (f.content.includes(needle)) {
        fail(
          "CHALLENGE_LEAKS_HIDDEN_ARTIFACT",
          `challenge/${f.path}`,
          `contains "${needle}" — ${what}. A filename blocklist would have missed this.`,
        );
      }
    }
  }

  const spec = byPath.get("SPEC.md") ?? "";
  const found = profile.requiredSpecCodes.filter((c) => spec.includes(c));
  if (found.length !== profile.requiredSpecCodes.length) {
    const missing = profile.requiredSpecCodes.filter((c) => !spec.includes(c));
    fail(
      "CHALLENGE_MISSING_SURFACE",
      "challenge/SPEC.md",
      `does not state ${missing.join(", ")}; every graded rule must be visible or the family is unfair`,
    );
  }

  // The manifest must agree with what was actually written, or a reviewer auditing the split is
  // auditing a document rather than the package.
  const manifestRaw = byPath.get("MANIFEST.json") ?? "";
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    return fail("CHALLENGE_MANIFEST_MISMATCH", "challenge/MANIFEST.json", "is not valid JSON");
  }
  const m = manifest as { visibleFiles?: unknown };
  const declared = Array.isArray(m.visibleFiles) ? m.visibleFiles.map(String).sort() : [];
  const actual = files
    .map((f) => f.path)
    .filter((p) => p !== "MANIFEST.json")
    .sort();
  if (declared.join("|") !== actual.join("|")) {
    fail(
      "CHALLENGE_MANIFEST_MISMATCH",
      "challenge/MANIFEST.json",
      `declares [${declared.join(", ")}] but the package contains [${actual.join(", ")}]`,
    );
  }

  return {
    files: files.length,
    bytes: files.reduce((n, f) => n + f.content.length, 0),
    specCodesFound: found.length,
    examples: files.filter((f) => f.path.startsWith("examples/")).length,
  };
}
