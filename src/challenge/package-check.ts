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

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

/** The path every family's visible stub is written to. Declared once; the starter rule keys off it. */
export const STARTER_FILE = "starter/subject.mjs";

/**
 * The surface an agent needs in order to be graded fairly.
 *
 * `starter/subject.mjs` was added after three families were found shipping a complete working
 * solution as their "stub". It is listed here for a narrower reason than the rest: while it is
 * absent, `checkStarterFailsEnough` has nothing to grade and would skip silently, and a gate that
 * skips is a gate that reads as green. Every one of the nine built families emits it, so requiring
 * it costs nothing and closes that door.
 */
export const REQUIRED_FILES = ["README.md", "SPEC.md", "types.ts", STARTER_FILE, "MANIFEST.json"] as const;

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

export const DAO_DESCENDANT_PROFILE: LeakProfile = {
  familyId: "dao-descendant",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "truth.ts", "answer-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the hidden grading function"],
    ["recomputeCurrentEpoch", "the named narrow adversary"],
    ["MUTANTS", "the hidden mutant bank"],
    ["selectMeasuredSet", "the hidden scenario selection"],
    ["ExternalLedgerHarness", "the harness-owned ledger implementation"],
    ["sealedEffects", "the private external effect ledger"],
    ["INTENDED_CHECK", "the mutant-to-check answer map"],
  ],
  requiredSpecCodes: [
    "DOR1_RECOVER_COMMITTED_KEY",
    "DOR2_EXACTLY_ONCE",
    "DOR3_RETRY_AFTER_UNKNOWN",
    "DOR4_TRUTHFUL_REPORT",
    "DOR5_LIVENESS",
  ],
};

export const TRADING_RECONCILIATION_PROFILE: LeakProfile = {
  familyId: "trading-reconciliation-recompute",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "truth.ts", "answer-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the hidden grading function"],
    ["recomputeCurrentAuthority", "the named narrow adversary"],
    ["recomputeAttemptCounter", "the held-out narrow adversary"],
    ["MUTANTS", "the hidden mutant bank"],
    ["selectMeasuredSet", "the hidden scenario selection"],
    ["VenueLedgerHarness", "the harness-owned venue ledger implementation"],
    ["sealedEffects", "the private execution ledger"],
    ["INTENDED_CHECK", "the mutant-to-check answer map"],
  ],
  requiredSpecCodes: [
    "TRR1_RECOVER_COMMITTED_ORDER_KEY",
    "TRR2_EXACTLY_ONE_VENUE_EXECUTION",
    "TRR3_RETRY_AFTER_UNKNOWN_ACCEPTANCE",
    "TRR4_TRUTHFUL_RECONCILIATION_REPORT",
    "TRR5_ORDER_LIVENESS",
  ],
};

export const DEPLOYMENT_ROLLBACK_PROFILE: LeakProfile = {
  familyId: "deployment-rollback-recompute",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "truth.ts", "answer-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the hidden grading function"],
    ["recomputeCurrentAuthority", "the named narrow adversary"],
    ["recomputeAttemptCounter", "the held-out narrow adversary"],
    ["MUTANTS", "the hidden mutant bank"],
    ["selectMeasuredSet", "the hidden scenario selection"],
    ["ControllerLedgerHarness", "the harness-owned controller ledger implementation"],
    ["sealedEffects", "the private rollback-effect ledger"],
    ["INTENDED_CHECK", "the mutant-to-check answer map"],
  ],
  requiredSpecCodes: [
    "DRR1_RECOVER_COMMITTED_ROLLBACK_KEY",
    "DRR2_EXACTLY_ONE_COMPENSATION",
    "DRR3_RETRY_AFTER_UNKNOWN_COMPENSATION",
    "DRR4_TRUTHFUL_ROLLBACK_REPORT",
    "DRR5_ROLLBACK_LIVENESS",
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

export const DEPLOYMENT_ALIAS_PROFILE: LeakProfile = {
  familyId: "deployment-model-alias-rollout-drift",
  forbiddenFilenames: [...FORBIDDEN_FILENAMES, "truth.ts", "answer-matrix.json"],
  forbiddenContent: [
    ["export function verify", "the hidden grading function"],
    ["decideRollout", "the hidden rollout decision procedure"],
    ["currentAliasFor", "the hidden alias-state generator"],
    ["rolloutLedgerFor", "the hidden rollout-ledger generator"],
    ["evalStreamFor", "the hidden eval-stream generator"],
    ["buildScenarioFromParts", "the hidden scenario builder"],
    ["selectMeasuredSet", "the graded-scenario selection"],
    ["enumerateSpace", "the full scenario-space enumeration"],
    ["MUTANTS", "the known-bad subject bank"],
    ["INTENDED_CHECK", "the hidden mutant answer map"],
    ["DeploymentHarness", "the verifier-owned rollout ledger harness"],
  ],
  requiredSpecCodes: [
    "DMD1_CURRENT_ALIAS_REQUIRED",
    "DMD2_CONCRETE_VERSION_ATTRIBUTED",
    "DMD3_BASELINE_MATCH_REQUIRED",
    "DMD4_ROLLOUT_WINDOW_REQUIRED",
    "DMD5_ROLLBACK_REQUIRED",
    "DMD6_CONTINUE_REQUIRED",
    "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED",
    "DMD8_NO_SUBJECT_OWNED_MODEL_TRUTH",
    "DMD9_AUDIT_ROLLOUT_EVIDENCE",
    "DMD10_REPORT_MATCHES_LEDGER",
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

// ---------------------------------------------------------------- the starter rule
//
// WHY THIS RULE EXISTS
//
// Everything above is a string search. That is the right shape for the leak it was built for — a
// hidden file copied into the visible tree keeps its identifiers — and it is completely blind to the
// leak that actually happened. Three of the eight families shipped a `starter/subject.mjs` that was
// a working answer: not a copy of `policy.ts`, a semantically equivalent reimplementation, written
// in plain JavaScript with none of the blocklisted names anywhere in it. Every profile above passed
// it. Measured: access-token 0/384 scenarios failing, delegated-wallet 0/804, deployment-alias
// 0/339. An agent handed those packages could submit the file it was given and score 100%.
//
// A blocklist cannot be extended to catch that, because the thing being detected is behaviour, not
// text. So the only honest check is the empirical one: run the starter through the family's own
// grader and look at the number. A stub fails nearly everything. An answer key fails nothing.
//
// WHY IT IS NOT IN `checkChallengePackage`
//
// The function above is pure, in-memory and instant, and it runs on every `challenge build` —
// including the eight builds inside `pnpm report` and the eight re-builds inside `pnpm verify`.
// Grading one family spawns a subprocess per scenario and takes 10-90 seconds; folding this in would
// have put roughly five minutes on the clock of both, twice over, for a property that can only
// change when a starter file changes. So it is a separate exported rule with its own entry point,
// and the enforcement points are the two that matter:
//
//   1. `test/starter-must-fail.test.ts` runs it over all nine live families on every `pnpm test`.
//      That is the non-skippable one — nothing merges past it.
//   2. `challenge build --verify-starter` runs it on demand for the family being built, and the
//      command's output states in plain text when the gate did NOT run, so a build that skipped it
//      cannot be mistaken for a build that passed it.
//
// The alternative — putting it in the fast path and letting people reach for a `--skip` flag when
// the wait annoys them — ends with the flag in the report script and the gate dead. Slow and
// explicit beats fast and routinely bypassed.

/**
 * The fraction of its own suite a family's visible starter must FAIL.
 *
 * 20% is deliberately far below where healthy families sit — the measured spread today is 54%
 * (ui-record-replay 174/324) to 100% (memory-poisoning 288/288) — because this rule is not a
 * difficulty measurement. It answers one question: is the stub an answer key? A starter that fails
 * fewer than one scenario in five is not a stub that happens to be good; it is a solution with
 * pieces knocked out, and the family it belongs to is measuring transcription.
 */
export const STARTER_MIN_FAILING_FRACTION = 0.2;

/** The shape of `routeFor(id).grade(...)`, restated so this module does not import the router. */
export interface StarterGrade {
  readonly cells: readonly { readonly failed: readonly string[] }[];
  readonly hostErrors: number;
}

/**
 * Grades a subject at an absolute path. Injected rather than imported: `routeFor` pulls in every
 * family's verifier, and a leak checker that imports the answer keys it is protecting is the same
 * mistake this file's header refuses to make with the builder.
 */
export type StarterGrader = (subjectPath: string) => StarterGrade;

export interface StarterCheckResult {
  readonly familyId: string;
  readonly scenarios: number;
  readonly failing: number;
  readonly failingFraction: number;
  readonly hostErrors: number;
}

/**
 * Grade a package's own visible starter and refuse the package if the starter passes too much.
 *
 * The whole visible package is materialised to a temp directory before grading, not just the starter
 * file: the hosts run the submitted module with the package root as its working directory, and a
 * starter that imports a sibling visible file would otherwise fail for a reason that has nothing to
 * do with whether it solves the task.
 */
export function checkStarterFailsEnough(
  familyId: string,
  files: readonly CheckableChallengeFile[],
  grade: StarterGrader,
): StarterCheckResult {
  const starter = files.find((f) => f.path === STARTER_FILE);
  if (starter === undefined) {
    fail(
      "CHALLENGE_MISSING_SURFACE",
      `challenge/${STARTER_FILE}`,
      "absent; there is no starter to grade, and a starter rule with nothing to grade is not a gate",
    );
  }

  const dir = mkdtempSync(join(tmpdir(), `starter-gate-${familyId}-`));
  for (const f of files) {
    const target = join(dir, f.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content, "utf8");
  }

  const graded = grade(join(dir, STARTER_FILE));
  const scenarios = graded.cells.length;

  // Refuse on no evidence rather than certify on no evidence. A grader that returned nothing is a
  // broken measurement, and "0 of 0 scenarios passed" is exactly the arithmetic that would let a
  // leaked starter through on a division nobody looked at.
  if (scenarios === 0) {
    fail(
      "CHALLENGE_STARTER_SOLVES_FAMILY",
      `challenge/${STARTER_FILE}`,
      `graded 0 scenarios for ${familyId}; the starter gate cannot certify a package it never measured`,
    );
  }

  const failing = graded.cells.filter((c) => c.failed.length > 0).length;
  const failingFraction = failing / scenarios;
  if (failingFraction < STARTER_MIN_FAILING_FRACTION) {
    fail(
      "CHALLENGE_STARTER_SOLVES_FAMILY",
      `challenge/${STARTER_FILE}`,
      [
        `fails only ${failing}/${scenarios} scenarios (${(failingFraction * 100).toFixed(1)}%) of ${familyId}'s own suite,`,
        `below the ${(STARTER_MIN_FAILING_FRACTION * 100).toFixed(0)}% a stub must fail.`,
        "The shipped starter is a working answer, so the family measures transcription rather than the mechanism.",
        "No identifier blocklist can see this: the leak is behavioural.",
      ].join(" "),
    );
  }

  return { familyId, scenarios, failing, failingFraction, hostErrors: graded.hostErrors };
}
