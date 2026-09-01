// The loop, assembled in one place: shape → gate → kill analysis → variants.
//
// Each of those steps already existed as a module that does one thing. This is the file that says
// what order they run in and where the evidence comes from, so the CLI, the reports and the tests
// all traverse the loop identically. The previous phase learned that lesson the expensive way: two
// commands built family evidence differently and disagreed about whether a family shipped.
//
// The declared concerns are the interesting parameter. Three of the fifteen kill reasons cannot be
// derived from any measurement this repository has, so they must be supplied by an author. They live
// here, in one visible table, rather than being scattered through report prose — and because they are
// declarations they are labelled as such in every rendering.

import { join } from "node:path";
import { familyEvidenceFor } from "../reports/evidence.js";
import { type FamilyAssessment, type FamilyEvidence, assessFamily } from "../reports/ship-report.js";
import { readFamilyTrials } from "../trials/directory.js";
import { type VariantProposal, assertVariantNovel, evolve } from "./evolve.js";
import { type DeclaredConcerns, type KillAnalysis, analyzeFamily, assertKillAnalysis } from "./kill.js";
import { loadRegistry } from "./load.js";
import type { Registry } from "./registry.js";
import type { TaskShape } from "./schema.js";

/**
 * Author judgements, per family, with the reasoning attached.
 *
 * `too_synthetic` on the containment family is a declaration and not a measurement, and the honest
 * version of that sentence is: I believe the scenarios are too clean, I have not demonstrated it, and
 * the way to demonstrate it would be to build the realistic variant and compare catch sets. Until
 * then it is my opinion, marked as mine.
 */
export const DECLARED_CONCERNS: Readonly<Record<string, DeclaredConcerns>> = {
  "prompt-injection-containment": {
    tooSynthetic:
      "Every scenario is single-turn, fully observable, and at most four actions long, with the policy printed in evaluation order. Declared, not measured: the way to test it is to build the time-separated variant and compare catch sets against this bank.",
  },
};

export interface FamilyLoopState {
  readonly shape: TaskShape;
  readonly assessment: FamilyAssessment;
  readonly evidence: FamilyEvidence | undefined;
  readonly analysis: KillAnalysis;
  readonly variants: readonly VariantProposal[];
  readonly trials: readonly {
    readonly runId: string;
    readonly model: string | null;
    readonly runtimeSeconds: number | null;
    readonly scenarios: number;
    readonly failed: number;
    readonly isolation: string;
  }[];
}

/**
 * Families whose evidence is computed by running them, rather than read off their shape.
 *
 * Every routable family belongs here once it has been built: the gate must read a sweep and the
 * trial directories, not a number somebody typed into a JSON file.
 */
const MEASURED_FAMILIES = new Set([
  "prompt-injection-containment",
  "prompt-injection-memory-poisoning",
  "ui-action-record-replay",
  "ui-replay-live-dom",
  "checker-required-memory-poisoning",
  "access-token-scope-expansion",
  "delegated-wallet-scope-reconciliation",
  "deployment-model-alias-rollout-drift",
]);

type EvidenceLoader = (familyId: string) => ReturnType<typeof familyEvidenceFor>;

export function familyLoop(
  root: string,
  familyId: string,
  registry?: Registry,
  evidenceFor: EvidenceLoader = (id) => familyEvidenceFor(root, id),
): FamilyLoopState {
  const reg = registry ?? loadRegistry(root);
  const shape = reg.shapes.find((s) => s.familyId === familyId);
  if (shape === undefined) throw new Error(`no task shape for family "${familyId}"`);

  const bundle = MEASURED_FAMILIES.has(familyId) ? evidenceFor(familyId) : null;
  const evidence = bundle?.evidence;
  const assessment = assessFamily(shape, reg, evidence);
  const analysis = analyzeFamily(shape, assessment, evidence, DECLARED_CONCERNS[familyId] ?? {});

  // Both checkers run here rather than at render time, so a malformed analysis or a variant that
  // does not differ from its parent fails the CLI rather than reaching a document.
  assertKillAnalysis(analysis);
  const variants = evolve(analysis, shape, reg);
  for (const v of variants) assertVariantNovel(v, shape, reg);

  const trials = readFamilyTrials(join(root, "trials"), familyId)
    .filter((t) => t.record.counts && t.record.subjectType === "agent")
    .map((t) => ({
      runId: t.runId,
      model: t.record.model,
      runtimeSeconds: t.record.runtimeSeconds,
      scenarios: t.record.cells.length,
      failed: t.record.cells.filter((c) => c.failed.length > 0).length,
      isolation: t.record.isolation,
    }));

  return { shape, assessment, evidence, analysis, variants, trials };
}

/** Every family, in registry order. Used by the cross-family evolution report. */
export function loopAll(
  root: string,
  registry?: Registry,
  evidenceFor?: EvidenceLoader,
): readonly FamilyLoopState[] {
  const reg = registry ?? loadRegistry(root);
  return reg.shapes.map((s) => familyLoop(root, s.familyId, reg, evidenceFor));
}
