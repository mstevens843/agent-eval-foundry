import { RigInputError, requireShape, rigIntegrity } from "../screens/rig-integrity.js";
import type { Phase15Candidate, Phase15ProbeResult } from "./types.js";

interface ComplexitySubject {
  readonly kind: "linear" | "nested-wildcards";
}

const complexitySemantics = (input: string): boolean => input.includes("=") && input.endsWith(";");

const evaluateComplexitySubject = (
  value: unknown,
  inputs: readonly string[],
  budget: number,
): readonly string[] => {
  const subject = requireShape(value, "complexity-subject", ["kind"]);
  if (subject.kind !== "linear" && subject.kind !== "nested-wildcards") {
    throw new RigInputError("complexity-subject.kind must be linear or nested-wildcards");
  }
  const parsed: ComplexitySubject = { kind: subject.kind };
  const failures: string[] = [];
  for (const input of inputs) {
    const expected = complexitySemantics(input);
    const observed = complexitySemantics(input);
    if (observed !== expected) failures.push("semantic_equivalence");
    const operations =
      parsed.kind === "linear"
        ? input.length + 1
        : expected || !input.includes("=")
          ? input.length + 1
          : (input.length + 1) * (input.length + 2);
    if (operations > budget) failures.push("adversarial_work_budget");
  }
  return [...new Set(failures)];
};

/**
 * A deterministic stand-in for the incident's missing CPU dimension.
 *
 * It deliberately counts abstract matcher work rather than wall time. A cheap probe whose verdict
 * changes with host load would validate nothing. The nested-wildcard mutant is semantically correct
 * on every public example and on the held-out input; only its declared work bound diverges.
 */
export function runRegexComplexityProbe(candidateId: string): Phase15ProbeResult {
  const publicInputs = ["x=y;", "name=value;", "no-equals"] as const;
  const adversarialInputs = [`x=${"x".repeat(32)}`] as const;
  const budget = 128;
  const knownGoodFailures = [
    ...evaluateComplexitySubject({ kind: "linear" }, publicInputs, budget),
    ...evaluateComplexitySubject({ kind: "linear" }, adversarialInputs, budget),
  ];
  const knownBadPublicFailures = evaluateComplexitySubject(
    { kind: "nested-wildcards" },
    publicInputs,
    budget,
  );
  const knownBadHiddenFailures = evaluateComplexitySubject(
    { kind: "nested-wildcards" },
    adversarialInputs,
    budget,
  );
  let malformedInputRefused = false;
  try {
    evaluateComplexitySubject({}, adversarialInputs, budget);
  } catch (error) {
    malformedInputRefused = error instanceof RigInputError;
  }
  const integrity = rigIntegrity(
    "phase15-deterministic-regex-complexity",
    [
      { id: "linear-reference", expect: "pass", observedFailures: knownGoodFailures },
      {
        id: "nested-wildcard-mutant",
        expect: "fail",
        observedFailures: knownBadHiddenFailures,
      },
    ],
    [knownGoodFailures, knownBadHiddenFailures],
  );
  const publicSubjectView = JSON.stringify({
    requestGrammar: "ASCII request strings of at most 64 bytes",
    matchSemantics: "match exactly one assignment terminated by a semicolon",
    operationBudget: budget,
    examples: publicInputs,
  });
  const witnessIsolated = adversarialInputs.every((input) => !publicSubjectView.includes(input));
  const heldOutConformsToPublicGrammar = adversarialInputs.every(
    (input) => input.length <= 64 && /^[\x20-\x7e]*$/.test(input),
  );
  const mechanismActivated =
    heldOutConformsToPublicGrammar &&
    knownBadPublicFailures.length === 0 &&
    knownBadHiddenFailures.includes("adversarial_work_budget") &&
    complexitySemantics(adversarialInputs[0]) === false;
  const usable = integrity.usable && malformedInputRefused;
  return {
    candidateId,
    probeType: "deterministic-regex-complexity",
    status: usable && mechanismActivated && witnessIsolated ? "survived" : "killed",
    reason:
      usable && mechanismActivated && witnessIsolated
        ? "The functional-only mutant passes the public semantic corpus but exceeds the deterministic held-out work budget; B6 controls hold."
        : "The probe did not establish a controlled semantic-correctness/resource-complexity divergence.",
    b6: {
      usable,
      knownGoodPassed: knownGoodFailures.length === 0,
      knownBadFailed: knownBadHiddenFailures.length > 0,
      malformedInputRefused,
      sameInvocation: true,
      reasons: integrity.reasons,
    },
    mechanismActivated,
    witnessIsolated,
    observations: {
      publicCases: publicInputs.length,
      publicMutantFailures: knownBadPublicFailures.length,
      heldOutCases: adversarialInputs.length,
      heldOutMutantFailures: knownBadHiddenFailures.length,
      heldOutConformsToPublicGrammar,
      workBudget: budget,
      referenceHeldOutOperations: adversarialInputs[0].length + 1,
      mutantHeldOutOperations: (adversarialInputs[0].length + 1) * (adversarialInputs[0].length + 2),
    },
  };
}

interface LayeredSubject {
  readonly kind: "composed" | "single-layer-only";
}

interface LayeredCase {
  readonly bytes: readonly number[];
  readonly layers: readonly ("reverse" | "xor-90")[];
  readonly expected: readonly number[];
}

const applyLayer = (bytes: readonly number[], layer: "reverse" | "xor-90"): readonly number[] =>
  layer === "reverse" ? [...bytes].reverse() : bytes.map((byte) => byte ^ 0x5a);

const evaluateLayeredSubject = (value: unknown, cases: readonly LayeredCase[]): readonly string[] => {
  const subject = requireShape(value, "layered-subject", ["kind"]);
  if (subject.kind !== "composed" && subject.kind !== "single-layer-only") {
    throw new RigInputError("layered-subject.kind must be composed or single-layer-only");
  }
  const parsed: LayeredSubject = { kind: subject.kind };
  const failures: string[] = [];
  for (const fixture of cases) {
    const layers = parsed.kind === "single-layer-only" ? fixture.layers.slice(0, 1) : fixture.layers;
    const observed = layers.reduce<readonly number[]>(
      (bytes, layer) => applyLayer(bytes, layer),
      fixture.bytes,
    );
    if (JSON.stringify(observed) !== JSON.stringify(fixture.expected)) {
      failures.push("composed_contract_exactness");
    }
  }
  return [...new Set(failures)];
};

export function runLayeredContractProbe(candidateId: string): Phase15ProbeResult {
  const raw = [1, 2, 3, 4] as const;
  const publicCases: readonly LayeredCase[] = [
    { bytes: raw, layers: ["reverse"], expected: [4, 3, 2, 1] },
    { bytes: raw, layers: ["xor-90"], expected: raw.map((byte) => byte ^ 0x5a) },
  ];
  const hiddenInput = [9, 8, 7, 6] as const;
  const hiddenExpected = applyLayer(applyLayer(hiddenInput, "reverse"), "xor-90");
  const heldOutCases: readonly LayeredCase[] = [
    { bytes: hiddenInput, layers: ["reverse", "xor-90"], expected: hiddenExpected },
  ];
  const knownGoodFailures = [
    ...evaluateLayeredSubject({ kind: "composed" }, publicCases),
    ...evaluateLayeredSubject({ kind: "composed" }, heldOutCases),
  ];
  const knownBadPublicFailures = evaluateLayeredSubject({ kind: "single-layer-only" }, publicCases);
  const knownBadHiddenFailures = evaluateLayeredSubject({ kind: "single-layer-only" }, heldOutCases);
  let malformedInputRefused = false;
  try {
    evaluateLayeredSubject([], heldOutCases);
  } catch (error) {
    malformedInputRefused = error instanceof RigInputError;
  }
  const integrity = rigIntegrity(
    "phase15-layered-contract-interaction",
    [
      { id: "composed-reference", expect: "pass", observedFailures: knownGoodFailures },
      { id: "single-layer-mutant", expect: "fail", observedFailures: knownBadHiddenFailures },
    ],
    [knownGoodFailures, knownBadHiddenFailures],
  );
  const witnessIsolated = !JSON.stringify(publicCases).includes(JSON.stringify(hiddenInput));
  const mechanismActivated =
    knownBadPublicFailures.length === 0 && knownBadHiddenFailures.includes("composed_contract_exactness");
  const usable = integrity.usable && malformedInputRefused;
  return {
    candidateId,
    probeType: "layered-contract-interaction",
    status: usable && mechanismActivated && witnessIsolated ? "survived" : "killed",
    reason:
      usable && mechanismActivated && witnessIsolated
        ? "The single-layer mutant passes each visible layer but fails their held-out composition; B6 controls hold."
        : "The probe did not isolate a composed-contract failure beyond its visible single layers.",
    b6: {
      usable,
      knownGoodPassed: knownGoodFailures.length === 0,
      knownBadFailed: knownBadHiddenFailures.length > 0,
      malformedInputRefused,
      sameInvocation: true,
      reasons: integrity.reasons,
    },
    mechanismActivated,
    witnessIsolated,
    observations: {
      publicSingleLayerCases: publicCases.length,
      publicMutantFailures: knownBadPublicFailures.length,
      heldOutComposedCases: heldOutCases.length,
      heldOutMutantFailures: knownBadHiddenFailures.length,
    },
  };
}

export function runPhase15Probe(candidate: Phase15Candidate): Phase15ProbeResult {
  if (candidate.cheapProbe.probeType === "deterministic-regex-complexity") {
    return runRegexComplexityProbe(candidate.candidateId);
  }
  if (candidate.cheapProbe.probeType === "layered-contract-interaction") {
    return runLayeredContractProbe(candidate.candidateId);
  }
  return {
    candidateId: candidate.candidateId,
    probeType: candidate.cheapProbe.probeType,
    status: "not-run",
    reason: "No executable Phase 15 probe adapter exists for this registered probe type.",
    b6: {
      usable: false,
      knownGoodPassed: false,
      knownBadFailed: false,
      malformedInputRefused: false,
      sameInvocation: false,
      reasons: ["probe adapter absent"],
    },
    mechanismActivated: false,
    witnessIsolated: false,
    observations: {},
  };
}
