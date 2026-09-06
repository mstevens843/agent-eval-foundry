// Phase 22 Lane 2 — the real caa-revalidation OperatorAdapter.
//
// Reuses, rather than re-derives, the exact selectors Phase 21's pilot built and piloted
// (`selectNaiveBaseline`/`selectSmallTargeted`, src/phase-21/pilot-caa-scenario-selection.ts) — those
// are the "operator" under test, and Phase 22 does not get to change them just because it is now
// grading them against a fairer envelope. What changes here is what they are graded AGAINST: this
// adapter exposes both the development bank (the original nine mutants those selectors were built and
// piloted with) and the held-out bank (src/phase-22/mutant-envelope.ts, never seen during that
// construction) through the same interface, so the orchestrator can run the identical comparison
// against either without knowing anything about CAA revalidation specifically.

import { reference } from "../../families/caa-revalidation/reference.js";
import { runCell } from "../../families/caa-revalidation/runner.js";
import { enumerateSpace, generateScenarios } from "../../families/caa-revalidation/scenarios.js";
import type { ScenarioParams } from "../../families/caa-revalidation/truth.js";
import type { Subject } from "../../families/caa-revalidation/types.js";
import { selectNaiveBaseline, selectSmallTargeted } from "../../phase-21/pilot-caa-scenario-selection.js";
import { buildMutantEnvelope, envelopeSubjectById } from "../mutant-envelope.js";
import type { CellGrade, EnvelopeMutantRef, OperatorAdapter } from "../operator-adapter.js";

const envelope = buildMutantEnvelope();
const subjectsById = envelopeSubjectById();

const asRefs = (entries: typeof envelope.development): readonly EnvelopeMutantRef[] =>
  entries.map((entry) => {
    const subject = subjectsById.get(entry.id);
    if (subject === undefined)
      throw new Error(`envelope declared mutant "${entry.id}" with no matching subject`);
    return { id: entry.id, label: entry.label, subject, intendedCheck: entry.intendedCheck };
  });

export const caaRevalidationAdapter: OperatorAdapter = {
  familyId: "caa-revalidation",
  adapterVersion: "1.0.0",
  operatorId: "hidden-scenario-selection-targets-narrow-mutants",
  sharedComponentDescriptions: {
    enumerateSpace: "src/families/caa-revalidation/scenarios.ts#enumerateSpace (imported, unmodified)",
    generateScenarios: "src/families/caa-revalidation/scenarios.ts#generateScenarios (imported, unmodified)",
    "verify (via runCell)": "src/families/caa-revalidation/runner.ts#runCell (imported, unmodified)",
    reference: "src/families/caa-revalidation/reference.ts#reference (imported, unmodified)",
  },
  enumerateScenarioSpace: () => enumerateSpace(),
  buildScenarios: (params) => generateScenarios(params as readonly ScenarioParams[]),
  selectNaive: (space, quota) => selectNaiveBaseline(space as readonly ScenarioParams[], quota),
  selectTargeted: (space, quota) => selectSmallTargeted(space as readonly ScenarioParams[], quota),
  gradeCell: (scenario, subject): CellGrade => {
    const cell = runCell(scenario as Parameters<typeof runCell>[0], subject as Subject);
    return { failures: cell.failures.map((f) => f.check) };
  },
  referenceSubject: reference,
  mutantEnvelope: {
    development: asRefs(envelope.development),
    heldOut: asRefs(envelope.heldOut),
  },
};
