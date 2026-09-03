import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkChallengePackage } from "../challenge/package-check.js";
import { forgedStableReport as daoForged, noOp as daoNoOp } from "../families/dao-descendant/mutants.js";
import { recomputeCurrentEpoch as daoNarrow } from "../families/dao-descendant/mutants.js";
import { reference as daoReference } from "../families/dao-descendant/reference.js";
import { runCell as runDaoCell, runFamily as runDaoFamily } from "../families/dao-descendant/runner.js";
import {
  designCell as daoDesignCell,
  enumerateSpace as daoEnumerate,
  generateScenarios as daoGenerate,
  selectProbeSet as daoProbe,
  selectMeasuredSet as daoSelect,
} from "../families/dao-descendant/scenarios.js";
import type { Scenario as DaoScenario } from "../families/dao-descendant/truth.js";
import type { Subject as DaoSubject } from "../families/dao-descendant/types.js";
import {
  recomputeAttemptCounter as rollbackAttempt,
  forgedStableReport as rollbackForged,
  recomputeCurrentAuthority as rollbackNarrow,
  noOp as rollbackNoOp,
} from "../families/deployment-rollback-recompute/mutants.js";
import { reference as rollbackReference } from "../families/deployment-rollback-recompute/reference.js";
import {
  runCell as runRollbackCell,
  runFamily as runRollbackFamily,
} from "../families/deployment-rollback-recompute/runner.js";
import {
  designCell as rollbackDesignCell,
  enumerateSpace as rollbackEnumerate,
  generateScenarios as rollbackGenerate,
  selectProbeSet as rollbackProbe,
  selectMeasuredSet as rollbackSelect,
} from "../families/deployment-rollback-recompute/scenarios.js";
import type { Scenario as RollbackScenario } from "../families/deployment-rollback-recompute/truth.js";
import type { Subject as RollbackSubject } from "../families/deployment-rollback-recompute/types.js";
import { type FamilySweep, builtFamily } from "../families/registry.js";
import {
  recomputeAttemptCounter as tradingAttempt,
  forgedStableReport as tradingForged,
  recomputeCurrentAuthority as tradingNarrow,
  noOp as tradingNoOp,
} from "../families/trading-reconciliation-recompute/mutants.js";
import { reference as tradingReference } from "../families/trading-reconciliation-recompute/reference.js";
import {
  runCell as runTradingCell,
  runFamily as runTradingFamily,
} from "../families/trading-reconciliation-recompute/runner.js";
import {
  designCell as tradingDesignCell,
  enumerateSpace as tradingEnumerate,
  generateScenarios as tradingGenerate,
  selectProbeSet as tradingProbe,
  selectMeasuredSet as tradingSelect,
} from "../families/trading-reconciliation-recompute/scenarios.js";
import type { Scenario as TradingScenario } from "../families/trading-reconciliation-recompute/truth.js";
import type { Subject as TradingSubject } from "../families/trading-reconciliation-recompute/types.js";
import { fail, isRecord, num, str, strArray } from "../foundry/schema.js";
import { assertCampaignChallenge, parseCampaignPlan } from "../trials/campaign.js";
import { prepareChallenge } from "../trials/run.js";

export const PHASE_13_SUBSTRATES = [
  "dao-descendant",
  "trading-reconciliation-recompute",
  "deployment-rollback-recompute",
] as const;

export type Phase13SubstrateId = (typeof PHASE_13_SUBSTRATES)[number];
export type DesignCellId = "U0C0" | "U1C0" | "U0C1" | "U1C1";

export interface Phase13Preregistration {
  readonly schema: string;
  readonly baselineCommit: string;
  readonly expectedSurvivors: number;
  readonly paidUsd: number;
  readonly modelReads: number;
  readonly maxPoints: number;
  readonly maxSelected: number;
  readonly substrateIds: readonly Phase13SubstrateId[];
}

export interface Phase13BoundarySource {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly url: string;
  readonly supports: readonly string[];
  readonly doesNotSupport: readonly string[];
}

export interface Phase13BoundaryMapping {
  readonly id: Phase13SubstrateId;
  readonly classification: string;
  readonly sourceIds: readonly string[];
  readonly conclusion: string;
  readonly limitation: string;
}

export interface Phase13BoundaryEvidence {
  readonly schema: "agent-eval-foundry/phase-13-boundary-evidence@1";
  readonly timing: "post-outcome";
  readonly evidenceUse: string;
  readonly sources: readonly Phase13BoundarySource[];
  readonly substrates: readonly Phase13BoundaryMapping[];
}

export function parsePhase13BoundaryEvidence(value: unknown): Phase13BoundaryEvidence {
  const top = isRecord(value)
    ? value
    : fail("E_SHAPE", "data/phase-13-boundary-evidence.json", "expected an object");
  const schema = str(top["schema"], "phase13.boundary.schema");
  if (schema !== "agent-eval-foundry/phase-13-boundary-evidence@1") {
    fail("E_SHAPE", "phase13.boundary.schema", `unsupported schema ${schema}`);
  }
  const timing = str(top["timing"], "phase13.boundary.timing");
  if (timing !== "post-outcome") {
    fail("E_SHAPE", "phase13.boundary.timing", "must preserve the post-outcome evidence timing");
  }
  const sourceRows = Array.isArray(top["sources"])
    ? top["sources"]
    : fail("E_SHAPE", "phase13.boundary.sources", "expected an array");
  const sources = sourceRows.map((entry, index): Phase13BoundarySource => {
    const row = isRecord(entry)
      ? entry
      : fail("E_SHAPE", `phase13.boundary.sources[${index}]`, "expected an object");
    return {
      id: str(row["id"], `phase13.boundary.sources[${index}].id`),
      kind: str(row["kind"], `phase13.boundary.sources[${index}].kind`),
      title: str(row["title"], `phase13.boundary.sources[${index}].title`),
      url: str(row["url"], `phase13.boundary.sources[${index}].url`),
      supports: strArray(row["supports"], `phase13.boundary.sources[${index}].supports`),
      doesNotSupport: strArray(row["doesNotSupport"], `phase13.boundary.sources[${index}].doesNotSupport`),
    };
  });
  if (new Set(sources.map((source) => source.id)).size !== sources.length) {
    fail("E_DUPLICATE_ID", "phase13.boundary.sources", "source ids must be unique");
  }
  const knownSources = new Set(sources.map((source) => source.id));
  const substrateRows = Array.isArray(top["substrates"])
    ? top["substrates"]
    : fail("E_SHAPE", "phase13.boundary.substrates", "expected an array");
  const substrates = substrateRows.map((entry, index): Phase13BoundaryMapping => {
    const row = isRecord(entry)
      ? entry
      : fail("E_SHAPE", `phase13.boundary.substrates[${index}]`, "expected an object");
    const id = str(row["id"], `phase13.boundary.substrates[${index}].id`);
    if (!PHASE_13_SUBSTRATES.includes(id as Phase13SubstrateId)) {
      fail("E_SHAPE", `phase13.boundary.substrates[${index}].id`, `unexpected substrate ${id}`);
    }
    const sourceIds = strArray(row["sourceIds"], `phase13.boundary.substrates[${index}].sourceIds`);
    const unknown = sourceIds.filter((sourceId) => !knownSources.has(sourceId));
    if (unknown.length > 0) {
      fail(
        "E_DANGLING_REF",
        `phase13.boundary.substrates[${index}].sourceIds`,
        `unknown source ids: ${unknown.join(", ")}`,
      );
    }
    return {
      id: id as Phase13SubstrateId,
      classification: str(row["classification"], `phase13.boundary.substrates[${index}].classification`),
      sourceIds,
      conclusion: str(row["conclusion"], `phase13.boundary.substrates[${index}].conclusion`),
      limitation: str(row["limitation"], `phase13.boundary.substrates[${index}].limitation`),
    };
  });
  if (
    substrates.length !== PHASE_13_SUBSTRATES.length ||
    new Set(substrates.map((substrate) => substrate.id)).size !== PHASE_13_SUBSTRATES.length
  ) {
    fail("E_SHAPE", "phase13.boundary.substrates", "must map each Phase 13 substrate exactly once");
  }
  return {
    schema: "agent-eval-foundry/phase-13-boundary-evidence@1",
    timing: "post-outcome",
    evidenceUse: str(top["evidenceUse"], "phase13.boundary.evidenceUse"),
    sources,
    substrates,
  };
}

export function parsePhase13Preregistration(value: unknown): Phase13Preregistration {
  const top = isRecord(value)
    ? value
    : fail("E_SHAPE", "data/phase-13-preregistration.json", "expected an object");
  const prediction = isRecord(top["prediction"])
    ? top["prediction"]
    : fail("E_SHAPE", "phase13.prediction", "expected an object");
  const budgets = isRecord(top["budgets"])
    ? top["budgets"]
    : fail("E_SHAPE", "phase13.budgets", "expected an object");
  const substrates = Array.isArray(top["substrates"])
    ? top["substrates"]
    : fail("E_SHAPE", "phase13.substrates", "expected an array");
  const substrateIds = substrates.map((entry, index) => {
    const row = isRecord(entry)
      ? entry
      : fail("E_SHAPE", `phase13.substrates[${index}]`, "expected an object");
    const id = str(row["id"], `phase13.substrates[${index}].id`);
    if (!PHASE_13_SUBSTRATES.includes(id as Phase13SubstrateId)) {
      fail("E_SHAPE", `phase13.substrates[${index}].id`, `unexpected substrate ${id}`);
    }
    return id as Phase13SubstrateId;
  });
  if (new Set(substrateIds).size !== PHASE_13_SUBSTRATES.length) {
    fail("E_SHAPE", "phase13.substrates", "must register each of the three substrates exactly once");
  }
  const parsed = {
    schema: str(top["schema"], "phase13.schema"),
    baselineCommit: str(top["baselineCommit"], "phase13.baselineCommit"),
    expectedSurvivors: num(prediction["cheapProbeSurvivors"], "phase13.prediction.cheapProbeSurvivors"),
    paidUsd: num(budgets["paidUsd"], "phase13.budgets.paidUsd"),
    modelReads: num(budgets["modelReads"], "phase13.budgets.modelReads"),
    maxPoints: num(
      budgets["maxEnumeratedParameterPointsPerNewSubstrate"],
      "phase13.budgets.maxEnumeratedParameterPointsPerNewSubstrate",
    ),
    maxSelected: num(
      budgets["maxSelectedScenariosPerSubstrate"],
      "phase13.budgets.maxSelectedScenariosPerSubstrate",
    ),
    substrateIds,
  };
  if (parsed.schema !== "agent-eval-foundry/phase-13-transfer-preregistration@1") {
    fail("E_SHAPE", "phase13.schema", `unsupported schema ${parsed.schema}`);
  }
  if (parsed.paidUsd !== 0 || parsed.modelReads !== 0) {
    fail("E_SHAPE", "phase13.budgets", "Phase 13 must remain zero-dollar and zero-model-read");
  }
  return parsed;
}

interface ComparableCell {
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly failures: readonly { readonly check: string }[];
  readonly localConfirmationsGreen: boolean;
  readonly effectCount: number;
}

interface ComparableScenario<P extends object> {
  readonly id: string;
  readonly params: P;
}

interface ComparableSubject {
  readonly id: string;
  readonly label: string;
}

interface ComparableRun<P extends object, S extends ComparableScenario<P>> {
  readonly scenarios: readonly S[];
  readonly cells: readonly ComparableCell[];
  readonly spaceSize: number;
  readonly rigUsable: boolean;
  readonly malformedInputRefused: boolean;
}

interface HeldOut<Subject extends ComparableSubject> {
  readonly subject: Subject;
  readonly intendedCheck: string;
}

interface BoundaryClaim {
  readonly stableLogicalIdentity: string;
  readonly committedValue: string;
  readonly recoveryContract: string;
  readonly safetyObligation: string;
  readonly livenessObligation: string;
  readonly inaccessibleWitness: string;
  readonly naturalRecomputationFailure: string;
  readonly realism: string;
}

interface Adapter<
  P extends object,
  Scenario extends ComparableScenario<P>,
  Subject extends ComparableSubject,
> {
  readonly id: Phase13SubstrateId;
  readonly domain: string;
  readonly campaignFile: string;
  readonly narrowId: string;
  readonly reference: Subject;
  readonly narrow: Subject;
  readonly heldOut: readonly HeldOut<Subject>[];
  readonly enumerate: () => readonly P[];
  readonly generate: (params: readonly P[]) => readonly Scenario[];
  readonly selectProbe: (space: readonly P[]) => readonly P[];
  readonly selectMeasured: (space: readonly P[]) => readonly P[];
  readonly designCell: (params: P) => DesignCellId;
  readonly runCell: (scenario: Scenario, subject: Subject) => ComparableCell;
  readonly runFamily: () => ComparableRun<P, Scenario>;
  readonly target: (params: P) => boolean;
  readonly actorCount: (params: P) => number;
  readonly boundary: BoundaryClaim;
}

export interface Phase13CellResult {
  readonly cell: DesignCellId;
  readonly referenceFailures: number;
  readonly narrowFailures: readonly string[];
  readonly narrowExactlyOnceFailed: boolean;
  readonly narrowLocalConfirmationGreen: boolean;
  readonly effects: number;
}

export interface Phase13HeldOutResult {
  readonly subjectId: string;
  readonly intendedCheck: string;
  readonly caughtInSelected: number;
  readonly caughtInTarget: number;
  readonly selectedScenarios: number;
  readonly targetScenarios: number;
}

export interface Phase13SubstrateResult {
  readonly id: Phase13SubstrateId;
  readonly domain: string;
  readonly status: "survived" | "killed";
  readonly boundary: BoundaryClaim & {
    readonly structurallyEnforced: boolean;
    readonly referenceNeedsPrivateKnowledge: boolean;
    readonly witnessExposedInSubjectApi: boolean;
    readonly provenance: Phase13BoundaryMapping;
  };
  readonly probe: {
    readonly cells: readonly Phase13CellResult[];
    readonly interactionContrast: number;
    readonly matchesPreregistration: boolean;
  };
  readonly grid: {
    readonly parameterPoints: number;
    readonly referenceFailures: number;
    readonly narrowFailures: number;
    readonly byRecoveryActors: readonly {
      readonly recoveryActors: number;
      readonly points: number;
      readonly failures: number;
    }[];
  };
  readonly selected: {
    readonly scenarios: number;
    readonly targetScenarios: number;
    readonly controls: number;
    readonly referenceFailures: number;
    readonly narrowFailures: number;
    readonly narrowTargetFailures: number;
    readonly narrowControlFailures: number;
    readonly narrowTargetLocalGreen: number;
    readonly heldOut: readonly Phase13HeldOutResult[];
    readonly intendedMutantsCaught: number;
    readonly intendedMutantsTotal: number;
  };
  readonly package: {
    readonly challengeHash: string;
    readonly scenarioSetId: string;
    readonly files: number;
    readonly examples: number;
    readonly deterministic: boolean;
    readonly routeHostErrors: number;
    readonly starterFailures: number;
    readonly campaignFile: string;
    readonly campaignPresent: boolean;
    readonly campaignHashCurrent: boolean;
    readonly campaignSlotsNotRun: number;
    readonly trialReady: boolean;
  };
  readonly killSignalsTriggered: readonly string[];
}

export interface Phase13Results {
  readonly schema: "agent-eval-foundry/phase-13-transfer-results@1";
  readonly preregistration: {
    readonly path: string;
    readonly sha256: string;
    readonly baselineCommit: string;
    readonly expectedSurvivors: number;
  };
  readonly substrates: readonly Phase13SubstrateResult[];
  readonly summary: {
    readonly probesRun: number;
    readonly probeSurvivors: number;
    readonly packagesTrialReady: number;
    readonly paidUsd: 0;
    readonly modelReads: 0;
    readonly localTransferEstablished: boolean;
    readonly agentDifficultyEstablished: false;
    readonly prospectiveRealSystemTransferEstablished: false;
  };
  readonly boundaryEvidence: {
    readonly path: string;
    readonly sha256: string;
    readonly timing: "post-outcome";
    readonly evidenceUse: string;
    readonly sources: readonly Phase13BoundarySource[];
  };
  readonly phase12Correction: string;
  readonly phase13Corrections: readonly string[];
}

const daoAttemptCounter: DaoSubject = {
  id: "recompute-from-attempt-counter",
  label: "Recompute from the retry attempt rather than recover the committed key",
  run(view, tool) {
    const idempotencyKey = `idem::${view.intent.actionId}::${view.intent.requestId}::epoch-${view.attempt * 13}`;
    const receipt = tool.execute(view.intent.actionId, {
      idempotencyKey,
      payload: view.intent.payload,
    });
    return {
      actionId: view.intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey,
      outcome: "executed",
      toolOk: receipt.ok,
    };
  },
};

const adapters = (): readonly Adapter<object, ComparableScenario<object>, ComparableSubject>[] => [
  {
    id: "dao-descendant",
    domain: "durable approval outbox",
    campaignFile: "campaigns/dao-descendant-transfer-smoke-2026-09.json",
    narrowId: daoNarrow.id,
    reference: daoReference,
    narrow: daoNarrow,
    heldOut: [
      { subject: daoNoOp, intendedCheck: "liveness" },
      { subject: daoForged, intendedCheck: "report_matches_call_ledger" },
      { subject: daoAttemptCounter, intendedCheck: "exactly_once" },
    ],
    enumerate: daoEnumerate,
    generate: daoGenerate as (params: readonly object[]) => readonly DaoScenario[],
    selectProbe: daoProbe as (space: readonly object[]) => readonly object[],
    selectMeasured: daoSelect as (space: readonly object[]) => readonly object[],
    designCell: daoDesignCell as (params: object) => DesignCellId,
    runCell: runDaoCell as unknown as (
      scenario: ComparableScenario<object>,
      subject: ComparableSubject,
    ) => ComparableCell,
    runFamily: runDaoFamily as () => ComparableRun<object, ComparableScenario<object>>,
    target: (params) => {
      const row = params as { crashPosition: string; nWorkers: number };
      return row.crashPosition === "after_tool" && row.nWorkers > 1;
    },
    actorCount: (params) => (params as { nWorkers: number }).nWorkers,
    boundary: {
      stableLogicalIdentity: "actionId + requestId",
      committedValue: "idempotencyKey stored in the durable outbox intent before the first call",
      recoveryContract: "replacement workers retry the same logical action with the committed key",
      safetyObligation: "at most one external effect per action",
      livenessObligation: "at least one external effect for every valid action",
      inaccessibleWitness: "host-owned per-action call and effect ledgers",
      naturalRecomputationFailure: "lease ownership changes while action identity does not",
      realism: "simulated calibration package with service-backed source-task precedent",
    },
  },
  {
    id: "trading-reconciliation-recompute",
    domain: "trading order reconciliation",
    campaignFile: "campaigns/trading-reconciliation-recompute-transfer-smoke-2026-09.json",
    narrowId: tradingNarrow.id,
    reference: tradingReference,
    narrow: tradingNarrow,
    heldOut: [
      { subject: tradingNoOp, intendedCheck: "liveness" },
      { subject: tradingForged, intendedCheck: "report_matches_venue_ledger" },
      { subject: tradingAttempt, intendedCheck: "exactly_once" },
    ],
    enumerate: tradingEnumerate,
    generate: tradingGenerate as (params: readonly object[]) => readonly TradingScenario[],
    selectProbe: tradingProbe as (space: readonly object[]) => readonly object[],
    selectMeasured: tradingSelect as (space: readonly object[]) => readonly object[],
    designCell: tradingDesignCell as (params: object) => DesignCellId,
    runCell: runTradingCell as unknown as (
      scenario: ComparableScenario<object>,
      subject: ComparableSubject,
    ) => ComparableCell,
    runFamily: runTradingFamily as () => ComparableRun<object, ComparableScenario<object>>,
    target: (params) => {
      const row = params as { crashPosition: string; nReconcilers: number };
      return row.crashPosition === "after_venue_accept" && row.nReconcilers > 1;
    },
    actorCount: (params) => (params as { nReconcilers: number }).nReconcilers,
    boundary: {
      stableLogicalIdentity: "orderIntentId + clientRequestId",
      committedValue: "client order key stored in the durable order intent before venue submission",
      recoveryContract: "a replacement reconciler retries a lost accepted order with the committed key",
      safetyObligation: "at most one venue execution per order intent",
      livenessObligation: "at least one venue execution for every valid order intent",
      inaccessibleWitness: "host-owned venue call and execution ledgers",
      naturalRecomputationFailure: "reconciliation ownership changes while client order identity does not",
      realism: "synthetic venue protocol; no production exchange or market mechanics",
    },
  },
  {
    id: "deployment-rollback-recompute",
    domain: "deployment rollback",
    campaignFile: "campaigns/deployment-rollback-recompute-transfer-smoke-2026-09.json",
    narrowId: rollbackNarrow.id,
    reference: rollbackReference,
    narrow: rollbackNarrow,
    heldOut: [
      { subject: rollbackNoOp, intendedCheck: "liveness" },
      { subject: rollbackForged, intendedCheck: "report_matches_controller_ledger" },
      { subject: rollbackAttempt, intendedCheck: "exactly_once" },
    ],
    enumerate: rollbackEnumerate,
    generate: rollbackGenerate as (params: readonly object[]) => readonly RollbackScenario[],
    selectProbe: rollbackProbe as (space: readonly object[]) => readonly object[],
    selectMeasured: rollbackSelect as (space: readonly object[]) => readonly object[],
    designCell: rollbackDesignCell as (params: object) => DesignCellId,
    runCell: runRollbackCell as unknown as (
      scenario: ComparableScenario<object>,
      subject: ComparableSubject,
    ) => ComparableCell,
    runFamily: runRollbackFamily as () => ComparableRun<object, ComparableScenario<object>>,
    target: (params) => {
      const row = params as { crashPosition: string; nControllers: number };
      return row.crashPosition === "after_compensation" && row.nControllers > 1;
    },
    actorCount: (params) => (params as { nControllers: number }).nControllers,
    boundary: {
      stableLogicalIdentity: "rollbackIntentId + releaseId",
      committedValue: "rollback key stored after authorization and before controller invocation",
      recoveryContract:
        "a replacement controller retries completed-but-unconfirmed compensation with the committed key",
      safetyObligation: "at most one compensation effect per rollback intent",
      livenessObligation: "at least one compensation effect for every supplied authorized rollback intent",
      inaccessibleWitness: "host-owned controller call and rollback-effect ledgers",
      naturalRecomputationFailure: "controller authority changes while authorized rollback identity does not",
      realism: "synthetic controller protocol; no production cloud or rollback-decision policy",
    },
  },
];

const countFailures = (cells: readonly ComparableCell[], check?: string): number =>
  cells.filter((cell) =>
    check === undefined ? cell.failures.length > 0 : cell.failures.some((failure) => failure.check === check),
  ).length;

function measureSubstrate(
  root: string,
  adapter: Adapter<object, ComparableScenario<object>, ComparableSubject>,
  preregistration: Phase13Preregistration,
  provenance: Phase13BoundaryMapping,
): Phase13SubstrateResult {
  const space = adapter.enumerate();
  const probeScenarios = adapter.generate(adapter.selectProbe(space));
  const probeCells = probeScenarios.map((scenario): Phase13CellResult => {
    const ref = adapter.runCell(scenario, adapter.reference);
    const narrow = adapter.runCell(scenario, adapter.narrow);
    return {
      cell: adapter.designCell(scenario.params),
      referenceFailures: ref.failures.length,
      narrowFailures: narrow.failures.map((failure) => failure.check),
      narrowExactlyOnceFailed: narrow.failures.some((failure) => failure.check === "exactly_once"),
      narrowLocalConfirmationGreen: narrow.localConfirmationsGreen,
      effects: narrow.effectCount,
    };
  });
  const outcome = (cell: DesignCellId): number =>
    probeCells.find((row) => row.cell === cell)?.narrowExactlyOnceFailed === true ? 1 : 0;
  const interactionContrast = outcome("U1C1") - outcome("U1C0") - outcome("U0C1") + outcome("U0C0");
  const matchesPreregistration =
    probeCells.every((cell) => cell.referenceFailures === 0 && cell.narrowLocalConfirmationGreen) &&
    outcome("U0C0") === 0 &&
    outcome("U1C0") === 0 &&
    outcome("U0C1") === 0 &&
    outcome("U1C1") === 1;

  const gridScenarios = adapter.generate(space);
  const gridReference = gridScenarios.map((scenario) => adapter.runCell(scenario, adapter.reference));
  const gridNarrow = gridScenarios.map((scenario) => adapter.runCell(scenario, adapter.narrow));
  const actorValues = [...new Set(space.map(adapter.actorCount))].sort((a, b) => a - b);
  const byRecoveryActors = actorValues.map((recoveryActors) => {
    const ids = new Set(
      gridScenarios
        .filter((scenario) => adapter.actorCount(scenario.params) === recoveryActors)
        .map((scenario) => scenario.id),
    );
    const cells = gridNarrow.filter((cell) => ids.has(cell.scenarioId));
    return { recoveryActors, points: cells.length, failures: countFailures(cells, "exactly_once") };
  });

  const run = adapter.runFamily();
  const targetIds = new Set(
    run.scenarios.filter((scenario) => adapter.target(scenario.params)).map((scenario) => scenario.id),
  );
  const narrowCells = run.cells.filter((cell) => cell.subjectId === adapter.narrowId);
  const targetNarrow = narrowCells.filter((cell) => targetIds.has(cell.scenarioId));
  const controlNarrow = narrowCells.filter((cell) => !targetIds.has(cell.scenarioId));
  const heldOut = adapter.heldOut.map(({ subject, intendedCheck }): Phase13HeldOutResult => {
    const cells = run.scenarios.map((scenario) => adapter.runCell(scenario, subject));
    const targetCells = cells.filter((cell) => targetIds.has(cell.scenarioId));
    return {
      subjectId: subject.id,
      intendedCheck,
      caughtInSelected: countFailures(cells, intendedCheck),
      caughtInTarget: countFailures(targetCells, intendedCheck),
      selectedScenarios: cells.length,
      targetScenarios: targetCells.length,
    };
  });

  const family = builtFamily(adapter.id);
  const sweep: FamilySweep = family.run();
  const prepared = prepareChallenge(root, adapter.id);
  const repeated = prepareChallenge(root, adapter.id);
  const packageCheck = checkChallengePackage(prepared.pkg.files, family.leakProfile);
  const routeResult = prepared.route.grade(join(prepared.dir, "starter", "subject.mjs"));
  const campaignPath = join(root, adapter.campaignFile);
  const campaignPresent = existsSync(campaignPath);
  let campaignHashCurrent = false;
  let campaignSlotsNotRun = 0;
  if (campaignPresent) {
    const plan = parseCampaignPlan(JSON.parse(readFileSync(campaignPath, "utf8")), adapter.campaignFile);
    assertCampaignChallenge(plan, prepared.hash);
    campaignHashCurrent =
      plan.familyId === adapter.id &&
      plan.scenarioSetId === prepared.scenarioSetId &&
      plan.scenariosExpected === run.scenarios.length;
    campaignSlotsNotRun = plan.slots.filter((slot) => slot.state === "NOT_RUN").length;
  }

  const killSignals: string[] = [];
  if (!matchesPreregistration) killSignals.push("four-cell probe did not match the registered interaction");
  if (countFailures(gridReference) > 0) killSignals.push("reference failed the parameter sweep");
  if (targetNarrow.length === 0 || countFailures(targetNarrow, "exactly_once") !== targetNarrow.length) {
    killSignals.push("narrow recompute did not activate throughout the selected target stratum");
  }
  if (countFailures(controlNarrow, "exactly_once") > 0) {
    killSignals.push("narrow recompute failed a registered non-activation control on exactly-once");
  }
  if (heldOut.some((subject) => subject.caughtInSelected === 0)) {
    killSignals.push("a held-out subject survived its intended check");
  }
  if (!run.rigUsable || !run.malformedInputRefused) killSignals.push("B6 or wrong-shaped refusal failed");
  if (space.length > preregistration.maxPoints || run.scenarios.length > preregistration.maxSelected) {
    killSignals.push("registered local budget exceeded");
  }
  if (routeResult.hostErrors > 0) killSignals.push("trial route produced host errors");
  if (!campaignPresent || !campaignHashCurrent || campaignSlotsNotRun !== 2) {
    killSignals.push("matched not-run campaign is absent or stale");
  }

  const trialReady =
    killSignals.length === 0 &&
    prepared.hash === repeated.hash &&
    packageCheck.files > 0 &&
    routeResult.hostErrors === 0;
  return {
    id: adapter.id,
    domain: adapter.domain,
    status: killSignals.length === 0 ? "survived" : "killed",
    boundary: {
      ...adapter.boundary,
      structurallyEnforced: true,
      referenceNeedsPrivateKnowledge: false,
      witnessExposedInSubjectApi: false,
      provenance,
    },
    probe: { cells: probeCells, interactionContrast, matchesPreregistration },
    grid: {
      parameterPoints: space.length,
      referenceFailures: countFailures(gridReference),
      narrowFailures: countFailures(gridNarrow, "exactly_once"),
      byRecoveryActors,
    },
    selected: {
      scenarios: run.scenarios.length,
      targetScenarios: targetIds.size,
      controls: run.scenarios.length - targetIds.size,
      referenceFailures: countFailures(run.cells.filter((cell) => cell.subjectId === adapter.reference.id)),
      narrowFailures: countFailures(narrowCells),
      narrowTargetFailures: countFailures(targetNarrow, "exactly_once"),
      narrowControlFailures: countFailures(controlNarrow, "exactly_once"),
      narrowTargetLocalGreen: targetNarrow.filter((cell) => cell.localConfirmationsGreen).length,
      heldOut,
      intendedMutantsCaught: sweep.mutantsCaught.filter((mutant) => mutant.caught).length,
      intendedMutantsTotal: sweep.mutantsCaught.length,
    },
    package: {
      challengeHash: prepared.hash,
      scenarioSetId: prepared.scenarioSetId,
      files: packageCheck.files,
      examples: packageCheck.examples,
      deterministic: prepared.hash === repeated.hash,
      routeHostErrors: routeResult.hostErrors,
      starterFailures: routeResult.cells.filter((cell) => cell.failed.length > 0).length,
      campaignFile: adapter.campaignFile,
      campaignPresent,
      campaignHashCurrent,
      campaignSlotsNotRun,
      trialReady,
    },
    killSignalsTriggered: killSignals,
  };
}

export function measurePhase13(root: string): Phase13Results {
  const preregPath = join(root, "data", "phase-13-preregistration.json");
  const preregBytes = readFileSync(preregPath, "utf8");
  const preregistration = parsePhase13Preregistration(JSON.parse(preregBytes));
  const boundaryPath = join(root, "data", "phase-13-boundary-evidence.json");
  const boundaryBytes = readFileSync(boundaryPath, "utf8");
  const boundaryEvidence = parsePhase13BoundaryEvidence(JSON.parse(boundaryBytes));
  const provenanceById = new Map(boundaryEvidence.substrates.map((substrate) => [substrate.id, substrate]));
  const substrates = adapters().map((adapter) => {
    const provenance = provenanceById.get(adapter.id);
    if (provenance === undefined) throw new Error(`missing Phase 13 boundary evidence for ${adapter.id}`);
    return measureSubstrate(root, adapter, preregistration, provenance);
  });
  const survivors = substrates.filter((substrate) => substrate.status === "survived").length;
  const packagesTrialReady = substrates.filter((substrate) => substrate.package.trialReady).length;
  return {
    schema: "agent-eval-foundry/phase-13-transfer-results@1",
    preregistration: {
      path: "data/phase-13-preregistration.json",
      sha256: createHash("sha256").update(preregBytes).digest("hex"),
      baselineCommit: preregistration.baselineCommit,
      expectedSurvivors: preregistration.expectedSurvivors,
    },
    substrates,
    summary: {
      probesRun: substrates.length,
      probeSurvivors: survivors,
      packagesTrialReady,
      paidUsd: 0,
      modelReads: 0,
      localTransferEstablished: survivors === substrates.length,
      agentDifficultyEstablished: false,
      prospectiveRealSystemTransferEstablished: false,
    },
    boundaryEvidence: {
      path: "data/phase-13-boundary-evidence.json",
      sha256: createHash("sha256").update(boundaryBytes).digest("hex"),
      timing: boundaryEvidence.timing,
      evidenceUse: boundaryEvidence.evidenceUse,
      sources: boundaryEvidence.sources,
    },
    phase12Correction:
      "Four empty dao-descendant adversarial exploit/submitted-bypass directories lacked tracked .gitkeep files. Phase 13 added them after clone-fidelity failed; this repairs fresh-clone reproducibility without changing the challenge hash.",
    phase13Corrections: [
      "The first implementation shortened the preregistered held-out id recompute-from-attempt-counter to recompute-attempt-counter. The implementation was renamed to the registered id; the preregistration was not edited.",
      "The two new verifiers initially left the static specification probe blind because their recognizable outcome set sat outside a scoring-decision window. The same rule was moved into scoring scope without changing behavior; the probe now reads and clears it from visible text.",
      "Authoritative real-system source review for trading and deployment happened after local outcomes. It is retained as post-outcome provenance and cannot support a prospective source-first transfer claim.",
      "Campaign isolation was declared but not cross-checked against slot runners or preserved trial records. Plans now reject incompatible executable runners, and reconciliation reports any recorded-isolation mismatch.",
    ],
  };
}

export const renderPhase13Results = (results: Phase13Results): string =>
  `${JSON.stringify(results, null, 2)}\n`;

export function renderPhase13DesignMatrix(results: Phase13Results): string {
  return `${JSON.stringify(
    {
      schema: "agent-eval-foundry/phase-13-design-matrix@1",
      preregistrationSha256: results.preregistration.sha256,
      factors: [
        { id: "U", name: "uncertain-after-effect recovery", levels: [0, 1] },
        { id: "C", name: "changed recovery authority", levels: [0, 1] },
      ],
      rows: results.substrates.flatMap((substrate) =>
        substrate.probe.cells.map((cell) => ({
          substrateId: substrate.id,
          cell: cell.cell,
          uncertainAfterEffect: cell.cell.startsWith("U1"),
          changedAuthority: cell.cell.endsWith("C1"),
          referenceFailed: cell.referenceFailures > 0,
          narrowExactlyOnceFailed: cell.narrowExactlyOnceFailed,
          narrowLocalConfirmationGreen: cell.narrowLocalConfirmationGreen,
        })),
      ),
      estimand:
        "Within each substrate, Y11 - Y10 - Y01 + Y00 for the narrow subject's exactly-once failure; family differences are differences between those interaction contrasts.",
    },
    null,
    2,
  )}\n`;
}

export function renderPhase13TransferLab(results: Phase13Results): string {
  const probeRows = results.substrates.flatMap((substrate) =>
    substrate.probe.cells.map(
      (cell) =>
        `| \`${substrate.id}\` | \`${cell.cell}\` | ${cell.referenceFailures} | ${cell.narrowExactlyOnceFailed ? "fail" : "pass"} | ${cell.narrowLocalConfirmationGreen ? "green" : "not green"} | ${cell.effects} |`,
    ),
  );
  const boundaryRows = results.substrates.map(
    (substrate) =>
      `| \`${substrate.id}\` | ${substrate.boundary.stableLogicalIdentity} | ${substrate.boundary.inaccessibleWitness} | ${substrate.boundary.provenance.classification} | ${substrate.boundary.provenance.sourceIds.map((id) => `\`${id}\``).join(", ")} |`,
  );
  const sourceRows = results.boundaryEvidence.sources.map((source) => {
    const label = source.url.startsWith("https://")
      ? `[${source.title}](${source.url})`
      : `${source.title} (\`${source.url}\`)`;
    return `| \`${source.id}\` | ${source.kind} | ${label} | ${source.doesNotSupport.join("; ")} |`;
  });
  const activationRows = results.substrates.map((substrate) => {
    const byActors = substrate.grid.byRecoveryActors
      .map((row) => `${row.recoveryActors}: ${row.failures}/${row.points}`)
      .join("; ");
    return `| \`${substrate.id}\` | ${substrate.grid.parameterPoints} | ${substrate.grid.narrowFailures} | ${byActors} | ${substrate.selected.narrowTargetFailures}/${substrate.selected.targetScenarios} | ${substrate.selected.narrowControlFailures}/${substrate.selected.controls} |`;
  });
  const heldOutRows = results.substrates.flatMap((substrate) =>
    substrate.selected.heldOut.map(
      (subject) =>
        `| \`${substrate.id}\` | \`${subject.subjectId}\` | \`${subject.intendedCheck}\` | ${subject.caughtInSelected}/${subject.selectedScenarios} | ${subject.caughtInTarget}/${subject.targetScenarios} |`,
    ),
  );
  const packageRows = results.substrates.map(
    (substrate) =>
      `| \`${substrate.id}\` | \`${substrate.package.challengeHash}\` | \`${substrate.package.scenarioSetId}\` | ${substrate.package.files} | ${substrate.package.starterFailures}/24 | ${substrate.package.routeHostErrors} | ${substrate.package.trialReady ? "ready" : "blocked"} |`,
  );
  const killRows = results.substrates.map(
    (substrate) =>
      `| \`${substrate.id}\` | ${substrate.killSignalsTriggered.length === 0 ? "none" : substrate.killSignalsTriggered.join("; ")} |`,
  );
  const correctionRows = results.phase13Corrections.map((correction) => `- ${correction}`);

  return [
    "# Phase 13 - Controlled Family x Recipe Transfer Laboratory",
    "",
    "## Verdict",
    "",
    `The committed-authority recipe transferred mechanically in **${results.summary.probeSurvivors}/${results.summary.probesRun}** substrates, and **${results.summary.packagesTrialReady}/${results.substrates.length}** packages are trial-ready.`,
    "The result is local verifier, activation and package evidence. It is **not agent-difficulty evidence**:",
    `${results.summary.modelReads} model reads ran and $${results.summary.paidUsd.toFixed(2)} was spent.`,
    "",
    "The precise claim is that the same narrow defect, under the same controlled factors, creates an",
    "externally visible duplicate in three domain contracts. It does not show that an agent will write",
    "that defect, or that these are three independent difficulty axes.",
    "",
    "## Preregistration And Audit",
    "",
    `The preregistration is \`${results.preregistration.path}\` at SHA-256 \`${results.preregistration.sha256}\`, written against baseline commit \`${results.preregistration.baselineCommit}\`. It predicted ${results.preregistration.expectedSurvivors}/3 probe survivors.`,
    "",
    `Phase 12 correction: ${results.phase12Correction}`,
    "",
    "Phase 13 corrections:",
    "",
    ...correctionRows,
    "",
    `The boundary-source audit is \`${results.boundaryEvidence.path}\` at SHA-256 \`${results.boundaryEvidence.sha256}\`. Its timing is **${results.boundaryEvidence.timing}**.`,
    results.boundaryEvidence.evidenceUse,
    "",
    "This timing matters: the documents show that the abstractions have real-system precedent, but",
    "they cannot make the two novel transfers prospective or source-first after their local outcomes",
    "were already known. Phase 13 therefore preserves that claim as **not established**.",
    "",
    "## Boundary Proof",
    "",
    "| substrate | stable logical identity | inaccessible witness | provenance class | sources |",
    "|---|---|---|---|---|",
    ...boundaryRows,
    "",
    "For every package, the subject subprocess receives only the operation facade. The host records",
    "calls and effects in closure-owned arrays and returns sealed data to the parent verifier. The",
    "reference uses only the public view and facade. Trading and deployment are synthetic protocols:",
    "the process boundary is executable, while production-system fidelity remains unmeasured.",
    "",
    "### Documentary provenance",
    "",
    "| source | kind | location | explicitly does not establish |",
    "|---|---|---|---|",
    ...sourceRows,
    "",
    "The deployment abstraction is a documented-pattern composite: no cited product exposes the exact",
    "rollback-intent protocol implemented here. The trading abstraction similarly narrows a documented",
    "client-order identity and reconciliation boundary into a deterministic benchmark facade.",
    "",
    "## Minimal Identifiable Design",
    "",
    "`U` is uncertain completion after the external effect. `C` is changed recovery authority. Four",
    "cells are the smallest design that identifies both main effects and their interaction.",
    "",
    "| substrate | cell | reference failures | narrow exactly-once | own confirmation | effects |",
    "|---|---|---:|---|---|---:|",
    ...probeRows,
    "",
    "Every substrate has interaction contrast **1.0**: neither factor alone duplicates work; `U1C1`",
    "does. This rules out broad retry breakage and broad authority-change breakage in the probes.",
    "",
    "## Activation Sweep",
    "",
    "| substrate | grid points | broad narrow failures | by recovery actors | selected target | controls |",
    "|---|---:|---:|---|---:|---:|",
    ...activationRows,
    "",
    "The controlling condition is shared: one recovery actor structurally cannot cross authority and",
    "fails 0/18 grid points; two or more fail 9/18 because only the uncertain half activates. Selection",
    "raises narrow-mutant fatality from 27/72 in the broad grid to 18/24 overall and 18/18 in the named",
    "target stratum, while retaining six non-activation controls. All target failures remain locally green.",
    "",
    "## Held-Out Subjects",
    "",
    "Only the reference and current-authority recompute subject informed selection. These subjects were",
    "evaluated after the set was frozen:",
    "",
    "| substrate | held-out subject | intended check | caught in selected | caught in target |",
    "|---|---|---|---:|---:|",
    ...heldOutRows,
    "",
    "The no-op establishes the positive-work floor, the forged report establishes call-ledger",
    "reconciliation, and the attempt-counter variant shows the frozen target is not tied to one epoch",
    "formula.",
    "",
    "## Frozen Packages And Campaigns",
    "",
    "| family | challenge hash | scenario set | files | starter failures | host errors | campaign |",
    "|---|---|---|---:|---:|---:|---|",
    ...packageRows,
    "",
    "Each matched campaign has one Codex slot and one Claude import slot, both `NOT_RUN`. Its future",
    "$30 ceiling is a campaign authorization limit, not Phase 13 spend. A countable failure still needs",
    "two independent blind root-cause labels; only agreed capability can become difficulty evidence.",
    "Here `ready` means deterministic package, current hash, executable subprocess route, B6 controls,",
    "and a reconciled campaign contract. It does not mean container-isolated, human-evidenced,",
    "adversarial-audited, or agent-difficulty-evidenced.",
    "",
    "## Kill Signals",
    "",
    "| substrate | triggered |",
    "|---|---|",
    ...killRows,
    "",
    "## Interpretation",
    "",
    "The result supports **recipe portability**: a durable logical identity, a committed key, uncertain",
    "external completion, changed recovery authority, and an inaccessible effect witness can be expressed",
    "fairly and checked in all three substrates. The family effect on this local interaction is zero: all",
    "three interaction contrasts are 1.0.",
    "",
    "The result does not yet support **hardness portability**. The three implementations are deliberately",
    "isomorphic, the specifications state the key-recovery rule explicitly, and no agent attempted them.",
    "A future controlled ablation must distinguish which recipe operators change agent behavior, followed",
    "by matched cross-provider smoke trials only after those effects are registered.",
    "It also does not establish prospective real-system transfer because the external-source audit was",
    "performed after the local outcomes; a future transfer must begin from its source boundary.",
    "",
    "## Evidence Limits",
    "",
    "- Synthetic venue and controller facades are not production exchange or cloud-system measurements.",
    "- Three domain packages carrying one interaction are not three independent failure axes.",
    "- Mutant fatality proves verifier discrimination, not frontier difficulty.",
    "- The campaign manifests are prepared but every slot remains unrun.",
    "- The trial route isolates submitted code from host-owned evidence in a subprocess; it still shares the host filesystem and network, so adversarial no-bypass evidence remains absent.",
    "- No solve-rate, capability-attribution, or cost-per-agent-failure claim is created here.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}
