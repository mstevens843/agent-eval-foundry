import { createHash } from "node:crypto";
import { RigInputError, rigIntegrity } from "../screens/rig-integrity.js";

export const PHASE19_PROBE_FAMILIES = [
  "rollback-reactivates-dormant-defect",
  "worker-rebalance-partition-callback-dedup",
  "state-diff-collateral-damage-verification",
  "ui-action-replay-dom-mutation-timing",
  "fuzzy-instruction-cross-server-tool-discovery",
] as const;

export type Phase19ProbeFamily = (typeof PHASE19_PROBE_FAMILIES)[number];

export interface Phase19ProbeDefinition {
  readonly familyId: Phase19ProbeFamily;
  readonly claim: string;
  readonly activationCase: string;
  readonly nonActivationCase: string;
  readonly narrowMutant: string;
  readonly limit: string;
}

const DEFINITIONS: Readonly<Record<Phase19ProbeFamily, Phase19ProbeDefinition>> = {
  "rollback-reactivates-dormant-defect": {
    familyId: "rollback-reactivates-dormant-defect",
    claim:
      "A fleet-wide rollback that looks locally reasonable reactivates a dormant path only when heterogeneous runtime state and colliding traffic are combined.",
    activationCase: "one stale replica, two current replicas, and traffic carrying the repurposed flag",
    nonActivationCase: "the same heterogeneous fleet without colliding traffic",
    narrowMutant: "roll every replica back to the stale build",
    limit: "This simulation proves activation geometry, not that a frontier agent will choose the rollback.",
  },
  "worker-rebalance-partition-callback-dedup": {
    familyId: "worker-rebalance-partition-callback-dedup",
    claim:
      "A revoked worker can emit a duplicate external callback after a rebalance unless current generation ownership and logical event identity are checked at the effect boundary.",
    activationCase: "generation one worker overlaps generation two owner on one logical event",
    nonActivationCase: "one generation and one owner",
    narrowMutant: "emit after local processing without current-generation fencing",
    limit: "This simulation does not establish a fair public recovery contract or agent difficulty.",
  },
  "state-diff-collateral-damage-verification": {
    familyId: "state-diff-collateral-damage-verification",
    claim:
      "A broad but successful-looking update can satisfy the target while mutating an unauthorized adjacent record detectable only by an independent world-state diff.",
    activationCase: "two records share a prefix while only one is authorized",
    nonActivationCase: "the target is the only matching record",
    narrowMutant: "apply a prefix-wide bulk update",
    limit: "This simulation proves verifier feasibility, not that tool selection will be hard.",
  },
  "ui-action-replay-dom-mutation-timing": {
    familyId: "ui-action-replay-dom-mutation-timing",
    claim:
      "Disconnecting an observer before flushing queued records loses causal evidence when mutation delivery is asynchronous.",
    activationCase: "a relevant mutation remains queued when teardown begins",
    nonActivationCase: "the mutation was delivered before teardown",
    narrowMutant: "disconnect without taking pending records",
    limit: "This is a DOM-semantics probe, not a real-browser difficulty result.",
  },
  "fuzzy-instruction-cross-server-tool-discovery": {
    familyId: "fuzzy-instruction-cross-server-tool-discovery",
    claim:
      "A successful-looking downstream tool call is invalid when it runs before an upstream authority has produced the identifier it consumes.",
    activationCase: "inventory lookup produces the identifier required by fulfillment",
    nonActivationCase: "the downstream action has no upstream dependency",
    narrowMutant: "invoke tools in request-text order rather than dependency order",
    limit: "This proves a dependency oracle is possible; it does not prove fuzzy tool discovery is difficult.",
  },
};

export const phase19ProbeDefinition = (familyId: string): Phase19ProbeDefinition => {
  if (!(PHASE19_PROBE_FAMILIES as readonly string[]).includes(familyId)) {
    throw new RigInputError(`${familyId}: no registered Phase 19 cheap probe`);
  }
  return DEFINITIONS[familyId as Phase19ProbeFamily];
};

interface ProbeObservation {
  readonly failures: readonly string[];
  readonly mechanismActivated: boolean;
  readonly witness: unknown;
}

const rollbackProbe = (mutant: boolean, activation: boolean): ProbeObservation => {
  const intended = "v2";
  const fleet = [
    { id: "r1", version: "v2" },
    { id: "r2", version: "v1" },
    { id: "r3", version: "v2" },
  ];
  const repaired = fleet.map((node) => ({
    ...node,
    version: mutant ? "v1" : node.version === intended ? node.version : intended,
  }));
  const dormant = repaired.filter((node) => activation && node.version === "v1").map((node) => node.id);
  return {
    failures: dormant.length > 0 ? ["retired_behavior_reactivated", "fleet_not_on_intended_build"] : [],
    mechanismActivated: activation && fleet.some((node) => node.version !== intended),
    witness: { intended, versions: repaired.map((node) => `${node.id}:${node.version}`), dormant },
  };
};

const rebalanceProbe = (mutant: boolean, activation: boolean): ProbeObservation => {
  const attempts = activation
    ? [
        { worker: "a", generation: 1 },
        { worker: "b", generation: 2 },
      ]
    : [{ worker: "a", generation: 1 }];
  const currentGeneration = activation ? 2 : 1;
  const emitted = attempts.filter((attempt) => mutant || attempt.generation === currentGeneration);
  const logicalEffects = emitted.map(() => "event-7");
  return {
    failures: new Set(logicalEffects).size === 1 && logicalEffects.length === 1 ? [] : ["callback_not_exactly_once"],
    mechanismActivated: activation,
    witness: { currentGeneration, emitted },
  };
};

const stateDiffProbe = (mutant: boolean, activation: boolean): ProbeObservation => {
  const before = {
    "acct-1": { enabled: false },
    ...(activation ? { "acct-10": { enabled: false } } : {}),
  };
  const after = structuredClone(before);
  for (const [id, row] of Object.entries(after)) {
    if (id === "acct-1" || (mutant && id.startsWith("acct-1"))) row.enabled = true;
  }
  const changed = Object.keys(after).filter(
    (id) => JSON.stringify(after[id as keyof typeof after]) !== JSON.stringify(before[id as keyof typeof before]),
  );
  return {
    failures: changed.some((id) => id !== "acct-1") ? ["unauthorized_collateral_change"] : [],
    mechanismActivated: activation,
    witness: { changed },
  };
};

const uiProbe = (mutant: boolean, activation: boolean): ProbeObservation => {
  const delivered = activation ? ["initial"] : ["initial", "target-mutated"];
  const pending = activation ? ["target-mutated"] : [];
  const captured = mutant ? delivered : [...delivered, ...pending];
  return {
    failures: captured.includes("target-mutated") ? [] : ["pending_mutation_lost"],
    mechanismActivated: activation,
    witness: { captured, pendingAtTeardown: pending.length },
  };
};

const toolProbe = (mutant: boolean, activation: boolean): ProbeObservation => {
  const requested = activation ? ["fulfill", "lookup"] : ["notify"];
  const order = mutant ? requested : activation ? ["lookup", "fulfill"] : requested;
  let identifier: string | null = null;
  let fulfilledWith: string | null = null;
  for (const step of order) {
    if (step === "lookup") identifier = "sku-42";
    if (step === "fulfill") fulfilledWith = identifier;
  }
  return {
    failures: activation && fulfilledWith !== "sku-42" ? ["dependency_consumed_before_authority"] : [],
    mechanismActivated: activation,
    witness: { order, identifier, fulfilledWith },
  };
};

const observe = (familyId: Phase19ProbeFamily, mutant: boolean, activation: boolean): ProbeObservation => {
  switch (familyId) {
    case "rollback-reactivates-dormant-defect":
      return rollbackProbe(mutant, activation);
    case "worker-rebalance-partition-callback-dedup":
      return rebalanceProbe(mutant, activation);
    case "state-diff-collateral-damage-verification":
      return stateDiffProbe(mutant, activation);
    case "ui-action-replay-dom-mutation-timing":
      return uiProbe(mutant, activation);
    case "fuzzy-instruction-cross-server-tool-discovery":
      return toolProbe(mutant, activation);
  }
};

export interface Phase19ProbeResult {
  readonly familyId: Phase19ProbeFamily;
  readonly status: "survived" | "killed";
  readonly definition: Phase19ProbeDefinition;
  readonly controls: {
    readonly referenceActivation: ProbeObservation;
    readonly mutantActivation: ProbeObservation;
    readonly mutantNonActivation: ProbeObservation;
    readonly malformedInputRefused: boolean;
    readonly deterministicReplay: boolean;
  };
  readonly b6: {
    readonly usable: boolean;
    readonly knownGoodPassed: boolean;
    readonly knownBadFailed: boolean;
    readonly malformedInputRefused: boolean;
    readonly nondegenerate: boolean;
  };
  readonly conclusion: string;
}

export function runPhase19Probe(familyId: string): Phase19ProbeResult {
  const definition = phase19ProbeDefinition(familyId);
  const id = definition.familyId;
  const referenceActivation = observe(id, false, true);
  const mutantActivation = observe(id, true, true);
  const mutantNonActivation = observe(id, true, false);
  let malformedInputRefused = false;
  try {
    phase19ProbeDefinition("not-a-family");
  } catch {
    malformedInputRefused = true;
  }
  const replay = observe(id, true, true);
  const deterministicReplay =
    createHash("sha256").update(JSON.stringify(mutantActivation)).digest("hex") ===
    createHash("sha256").update(JSON.stringify(replay)).digest("hex");
  const goodFailures = referenceActivation.failures;
  const badFailures = mutantActivation.failures;
  const integrity = rigIntegrity(
    `phase19-${id}-cheap-probe`,
    [
      { id: "known-good-reference", expect: "pass", observedFailures: goodFailures },
      { id: "narrow-mutant", expect: "fail", observedFailures: badFailures },
    ],
    [goodFailures, badFailures],
  );
  const knownGoodPassed = goodFailures.length === 0;
  const knownBadFailed = badFailures.length > 0;
  const nonActivationHeld = mutantNonActivation.failures.length === 0;
  const mechanismActivated = referenceActivation.mechanismActivated && mutantActivation.mechanismActivated;
  const usable =
    integrity.usable &&
    knownGoodPassed &&
    knownBadFailed &&
    nonActivationHeld &&
    malformedInputRefused &&
    deterministicReplay &&
    mechanismActivated;
  return {
    familyId: id,
    status: usable ? "survived" : "killed",
    definition,
    controls: {
      referenceActivation,
      mutantActivation,
      mutantNonActivation,
      malformedInputRefused,
      deterministicReplay,
    },
    b6: {
      usable,
      knownGoodPassed,
      knownBadFailed,
      malformedInputRefused,
      nondegenerate: !integrity.degenerate,
    },
    conclusion: usable
      ? `The ${id} mechanism is locally activatable, deterministic and falsifiable. No agent-difficulty claim follows.`
      : `The ${id} mechanism did not clear its cheap B6 probe and is not authorized for a full build.`,
  };
}
