// Consistency between the ledger and the gate.
//
// The ledger says what we decided. The gate says what the evidence supports. Nothing had been
// checking that those agree, and they drift in one direction: a family gets promoted in the ledger
// after a good week, the gate keeps failing, and the two live side by side in the same repository
// telling different stories. The ledger is the one people read.
//
// Three rules, each of which fired at least once while being written:
//
//   a family the gate calls NOT-READY may not be recorded as shipped
//   a family recorded as killed must have a kill analysis with a reason
//   a family recorded as `built` must actually execute
//
// The third is the one that would otherwise rot fastest: `built` is a status anyone can type.

import type { FamilyAssessment } from "../reports/ship-report.js";
import type { KillAnalysis } from "./kill.js";
import type { Candidate, TaskShape } from "./schema.js";
import { fail } from "./schema.js";

export interface ConsistencyInput {
  readonly candidates: readonly Candidate[];
  readonly shapes: readonly TaskShape[];
  /** Gate verdicts, keyed by family id. */
  readonly verdicts: Readonly<Record<string, FamilyAssessment["verdict"]>>;
  /** Kill analyses, keyed by family id. */
  readonly analyses: Readonly<Record<string, KillAnalysis>>;
  readonly builtFamilyIds: readonly string[];
}

/** Ledger statuses that assert the family works and has been demonstrated. */
const ASSERTS_SHIPPED: ReadonlySet<string> = new Set(["shipped"]);
/** Ledger statuses that assert the family executes. */
const ASSERTS_BUILT: ReadonlySet<string> = new Set(["built", "screened", "trialed", "shipped"]);

/**
 * The family a ledger row is about.
 *
 * The ledger suffixes a row with `-built` when the row is about a family that got built, so the
 * screening decision and the family stay distinguishable. Matching on the raw id therefore linked
 * NOTHING: every consistency rule below silently skipped the two rows it most needed to check, and
 * the tests written to catch that passed because they were also using the wrong ids. Both were fixed
 * together; this is the reason the mapping is a named function rather than an inline lookup.
 */
export const familyIdOf = (candidateId: string): string => candidateId.replace(/-built$/, "");

export function assertLedgerConsistency(input: ConsistencyInput): void {
  const shapeIds = new Set(input.shapes.map((s) => s.familyId));

  for (const candidate of input.candidates) {
    const path = `candidate.${candidate.id}`;
    const familyId = familyIdOf(candidate.id);
    const verdict = input.verdicts[familyId];

    // 1. A shipped claim must survive the gate.
    if (ASSERTS_SHIPPED.has(candidate.status) && verdict !== undefined && verdict !== "SHIP") {
      fail(
        "LEDGER_STATUS_CONTRADICTS_GATE",
        path,
        `recorded as \`${candidate.status}\` while the ship gate says ${verdict}; the ledger and the gate must not tell different stories about the same family`,
      );
    }

    // 2. A kill must have an analysis behind it.
    if (candidate.decision === "kill") {
      const analysis = input.analyses[familyId];
      const hasNotes = (candidate.failureNotes ?? "").trim().length > 0;
      if (analysis === undefined && !hasNotes) {
        fail(
          "LEDGER_KILL_WITHOUT_ANALYSIS",
          path,
          "decision is `kill` with neither a kill analysis nor failure notes; a kill nobody wrote down teaches the next family nothing",
        );
      }
      if (analysis !== undefined && analysis.findings.length === 0) {
        fail("LEDGER_KILL_WITHOUT_ANALYSIS", path, "decision is `kill` and its analysis records no finding");
      }
    }

    // 3. `built` has to mean it executes SOMEWHERE, and the somewhere has to be named.
    //
    //    The first version of this rule required a module in this repository and immediately failed
    //    on `durable-approval-outbox` — which is genuinely built, shipped and trialed, in the
    //    Terminal-Bench project this repository grew out of. That is a real category, not an
    //    exception: a family can be built elsewhere and imported as a matrix. What it may not be is
    //    built nowhere, so the alternative to a local module is a shape that cites where the code is.
    if (ASSERTS_BUILT.has(candidate.status) && shapeIds.has(familyId)) {
      const local = input.builtFamilyIds.includes(familyId);
      const shape = input.shapes.find((s) => s.familyId === familyId);
      const citesExternal = (shape?.evidence ?? "").trim().length > 0;
      if (!local && !citesExternal) {
        fail(
          "LEDGER_STATUS_CONTRADICTS_GATE",
          path,
          `recorded as \`${candidate.status}\` with no runnable family module here and no evidence pointer on its shape; \`built\` is a claim about code that exists somewhere nameable`,
        );
      }
    }
  }
}

/**
 * A family the gate blocks for `not-already-solved` must have a postmortem on disk.
 *
 * Separate from the ledger check because it is about a document rather than a status: the whole
 * point of this phase is that a kill produces an artifact the next family is built against, and an
 * un-postmortemed kill is the failure mode the phase exists to prevent.
 */
export function assertPostmortemExists(
  familyId: string,
  assessment: FamilyAssessment,
  reportExists: boolean,
): void {
  if (!assessment.blockingFailures.includes("not-already-solved")) return;
  if (!reportExists) {
    fail(
      "LEDGER_KILL_WITHOUT_ANALYSIS",
      `family.${familyId}`,
      "fails the blocking `not-already-solved` gate and has no generated kill analysis; run `foundry kill analyze` and commit the report",
    );
  }
}
