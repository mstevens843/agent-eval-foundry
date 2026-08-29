// Generating a task shape FROM a built family, so the two cannot drift.
//
// The shape is the thing the ship gate reads. For an unbuilt family it is a pre-registration written
// by hand — that is the point of it. For a BUILT family, hand-writing it means the registry can say
// four axes while the code measures three, and nothing would notice: the gate reads the shape, and
// the shape is where the claim lives.
//
// So for built families the shape is generated: knobs from the declared space, mutants from the
// intended-check table, axis count from the matrix the family actually produces. What stays hand-
// written is the part that is genuinely editorial — the rules, the reference contract, the fairness
// and cheat-resistance arguments — and those are supplied here as prose and merged.
//
// `verify` regenerates and diffs, so a family whose axis count moves and whose shape does not is a
// build failure rather than a discrepancy someone notices in six months.

import { measure } from "../axis-meter.js";
import type { BuiltFamily } from "../families/registry.js";

export interface ShapeProse {
  readonly visibleRules: readonly string[];
  readonly hiddenGradedRegion: string;
  readonly referenceContract: readonly string[];
  readonly authoritativeSources: readonly {
    readonly name: string;
    readonly whatItSettles: string;
    readonly whyEngineCannotForge: string;
  }[];
  readonly fairnessConstraints: readonly string[];
  readonly cheatResistance: readonly string[];
  readonly expectedFailureModes: readonly string[];
  readonly evidence: string;
  readonly status: "built" | "screened" | "trialed" | "shipped";
  readonly agentTrialsRun: number | null;
  readonly agentTrialsPassed: number | null;
}

const knobType = (values: readonly unknown[]): "int" | "enum" | "bool" | "seed" =>
  values.every((v) => typeof v === "boolean")
    ? "bool"
    : values.every((v) => typeof v === "number")
      ? "int"
      : "enum";

/** Build the shape a built family's own code justifies. */
export function shapeFromFamily(family: BuiltFamily, prose: ShapeProse): unknown {
  const sweep = family.run();
  const axis = measure(sweep.matrix, { nullTrials: 3 });

  return {
    familyId: family.id,
    name: family.name,
    domain: family.domain,
    mechanisms: [...family.mechanisms],
    visibleRules: [...prose.visibleRules],
    hiddenGradedRegion: prose.hiddenGradedRegion,
    knobs: Object.entries(family.space).map(([name, values]) => ({
      name,
      type: name === "seed" ? "seed" : knobType(values),
      values: [...values],
      purpose: family.knobPurpose[name] ?? `declared knob \`${name}\``,
    })),
    authoritativeSources: prose.authoritativeSources.map((s) => ({ ...s })),
    referenceContract: [...prose.referenceContract],
    expectedMutants: sweep.mutantsCaught.map((m) => ({ mutantId: m.mutantId, mustFailCheck: m.check })),
    fairnessConstraints: [...prose.fairnessConstraints],
    cheatResistance: [...prose.cheatResistance],
    expectedFailureModes: [...prose.expectedFailureModes],
    estimatedBuildHours: family.estimatedBuildHours,
    estimatedFrontierUsd: family.estimatedFrontierUsd,
    status: prose.status,
    // Measured, and it means what it says: the family ran, its reference passed, its mutants were
    // caught, and the axis count below came out of the matrix rather than out of an estimate.
    dataQuality: "measured",
    evidence: prose.evidence,
    estimatedAxes: axis.independentAxes,
    agentTrialsRun: prose.agentTrialsRun,
    agentTrialsPassed: prose.agentTrialsPassed,
  };
}
