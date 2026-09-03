import { parseMatrix } from "../../matrix.js";
import { RigInputError, rigIntegrity } from "../../screens/rig-integrity.js";
import type { Matrix } from "../../types.js";
import { BASELINES, INTENDED_CHECK, MUTANTS, recomputeCurrentAuthority } from "./mutants.js";
import { reference } from "./reference.js";
import { enumerateSpace, generateScenarios, selectMeasuredSet } from "./scenarios.js";
import { type ControllerCall, type RollbackEffect, type Scenario, rollbackEffectId } from "./truth.js";
import type { DeploymentController, Subject } from "./types.js";
import { type Failure, verify } from "./verify.js";

export interface CellResult {
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly failures: readonly Failure[];
  readonly crashed: string | null;
  readonly localConfirmationsGreen: boolean;
  readonly effectCount: number;
}

export interface RunResult {
  readonly scenarios: readonly Scenario[];
  readonly subjects: readonly Subject[];
  readonly cells: readonly CellResult[];
  readonly spaceSize: number;
  readonly rigUsable: boolean;
  readonly malformedInputRefused: boolean;
}

export const ALL_SUBJECTS: readonly Subject[] = [reference, ...MUTANTS];

class ControllerLedgerHarness {
  private seq = 0;
  private attempt = 0;
  private controllerId = "";
  private authorityEpoch = 0;
  private readonly calls: ControllerCall[] = [];
  private readonly effects: RollbackEffect[] = [];
  private readonly effectByKey = new Map<string, string>();

  beginAttempt(attempt: number, controllerId: string, authorityEpoch: number): void {
    this.attempt = attempt;
    this.controllerId = controllerId;
    this.authorityEpoch = authorityEpoch;
  }

  facade(): DeploymentController {
    return {
      compensate: (rollbackIntentId, request) => {
        this.seq += 1;
        this.calls.push({
          seq: this.seq,
          attempt: this.attempt,
          controllerId: this.controllerId,
          authorityEpoch: this.authorityEpoch,
          rollbackIntentId,
          request: { ...request },
        });
        const prior = this.effectByKey.get(request.idempotencyKey);
        if (prior !== undefined) return { applied: true, effectId: prior, deduplicated: true };
        const id = rollbackEffectId(request.idempotencyKey);
        this.effectByKey.set(request.idempotencyKey, id);
        this.seq += 1;
        this.effects.push({
          seq: this.seq,
          rollbackIntentId,
          idempotencyKey: request.idempotencyKey,
          releaseId: request.releaseId,
          regionId: request.regionId,
          compensation: request.compensation,
          effectId: id,
        });
        return { applied: true, effectId: id, deduplicated: false };
      },
    };
  }

  sealedCalls(): readonly ControllerCall[] {
    return this.calls.map((call) => ({ ...call, request: { ...call.request } }));
  }

  sealedEffects(): readonly RollbackEffect[] {
    return this.effects.map((effect) => ({ ...effect }));
  }
}

export function runCell(scenario: Scenario, subject: Subject): CellResult {
  const harness = new ControllerLedgerHarness();
  const reports = [];
  try {
    for (const view of scenario.views) {
      harness.beginAttempt(view.attempt, view.controllerId, view.authorityEpoch);
      reports.push(subject.run(view, harness.facade()));
    }
    const effects = harness.sealedEffects();
    const failures = verify({ scenario, reports, calls: harness.sealedCalls(), effects });
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures,
      crashed: null,
      localConfirmationsGreen: reports.every(
        (report) => report.controllerApplied && report.outcome === "compensated",
      ),
      effectCount: effects.length,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: [{ check: "local_confirmation_green", detail: `subject threw: ${(err as Error).message}` }],
      crashed: (err as Error).message,
      localConfirmationsGreen: false,
      effectCount: 0,
    };
  }
}

export function runFamily(subjects: readonly Subject[] = ALL_SUBJECTS): RunResult {
  const space = enumerateSpace();
  const scenarios = generateScenarios(selectMeasuredSet(space));
  const cells = subjects.flatMap((subject) => scenarios.map((scenario) => runCell(scenario, subject)));
  const referenceCells = cells.filter((cell) => cell.subjectId === reference.id);
  const badCells = cells.filter((cell) => cell.subjectId === recomputeCurrentAuthority.id);
  const rig = rigIntegrity(
    "deployment-rollback-transfer-sweep",
    [
      {
        id: reference.id,
        expect: "pass",
        observedFailures: referenceCells.flatMap((cell) => cell.failures.map((item) => item.check)),
      },
      {
        id: recomputeCurrentAuthority.id,
        expect: "fail",
        observedFailures: badCells.flatMap((cell) => cell.failures.map((item) => item.check)),
      },
    ],
    badCells.map((cell) => cell.failures.map((item) => item.check)),
  );
  let malformedInputRefused = false;
  try {
    verify({});
  } catch (err) {
    malformedInputRefused = err instanceof RigInputError;
  }
  if (!rig.usable || !malformedInputRefused) {
    throw new Error(
      `deployment rollback rig is void: ${[
        ...rig.reasons,
        malformedInputRefused ? "" : "wrong-shaped input was graded",
      ]
        .filter(Boolean)
        .join("; ")}`,
    );
  }
  return {
    scenarios,
    subjects,
    cells,
    spaceSize: space.length,
    rigUsable: rig.usable,
    malformedInputRefused,
  };
}

export function toMatrix(run: RunResult): Matrix {
  const graded = run.subjects.filter((subject) => subject.id !== "reference");
  const byCell = new Map(run.cells.map((cell) => [`${cell.scenarioId}|${cell.subjectId}`, cell]));
  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "deployment-rollback-recompute",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      extracted_from: [
        "src/families/deployment-rollback-recompute/runner.ts (B6-gated sweep)",
        "src/families/deployment-rollback-recompute/verify.ts (sealed controller-ledger grading)",
      ],
      caveat:
        "This is local transfer and mutant-discrimination evidence over a synthetic deployment controller. No paid agent trial or production controller is represented.",
    },
    reference_subject: "reference",
    subjects: graded.map((subject) => ({
      id: subject.id,
      label: subject.label,
      family: BASELINES.includes(subject.id as never) ? "baseline" : "mutant",
      model: null,
      effort: null,
      note: INTENDED_CHECK[subject.id] ?? null,
    })),
    instances: run.scenarios.map((scenario) => ({
      id: scenario.id,
      schedule: `${scenario.params.crashPosition}/controllers-${scenario.params.nControllers}`,
      seed: scenario.params.seed,
      keys: scenario.params.effects,
      family: "rollback-recompute-recovery",
      source: "generated",
      note: `committed rollback identity across ${scenario.views.length} controller attempt(s)`,
    })),
    results: Object.fromEntries(
      run.scenarios.map((scenario) => [
        scenario.id,
        Object.fromEntries(
          graded.map((subject) => {
            const cell = byCell.get(`${scenario.id}|${subject.id}`);
            return [
              subject.id,
              { failed: [...new Set((cell?.failures ?? []).map((failure) => failure.check))].sort() },
            ];
          }),
        ),
      ]),
    ),
  });
}

export const referenceFailures = (run: RunResult): readonly CellResult[] =>
  run.cells.filter((cell) => cell.subjectId === "reference" && cell.failures.length > 0);

export { BASELINES, INTENDED_CHECK };
