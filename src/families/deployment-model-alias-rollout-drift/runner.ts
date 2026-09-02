import { parseMatrix } from "../../matrix.js";
import type { Matrix } from "../../types.js";
import { BASELINES, INTENDED_CHECK, MUTANTS } from "./mutants.js";
import { reference, resetCompletionRecords } from "./reference.js";
import { enumerateSpace, generateScenarios, selectMeasuredSet } from "./scenarios.js";
import {
  type DeploymentCall,
  type EffectRecord,
  type Scenario,
  expectedEffectId,
  withAttempt,
} from "./truth.js";
import type { DeploymentFacade, RolloutEffectRequest, Subject, SubjectReport } from "./types.js";
import { CHECKS, type Failure, verify } from "./verify.js";

export interface CellResult {
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly failures: readonly Failure[];
  readonly crashed: string | null;
}

export interface RunResult {
  readonly scenarios: readonly Scenario[];
  readonly subjects: readonly Subject[];
  readonly cells: readonly CellResult[];
  readonly spaceSize: number;
}

export const ALL_SUBJECTS: readonly Subject[] = [reference, ...MUTANTS];

class DeploymentHarness {
  private seq = 0;
  private attempt = 0;
  private readonly calls: DeploymentCall[] = [];
  private readonly effects: EffectRecord[] = [];

  constructor(private readonly scenario: Scenario) {}

  beginAttempt(attempt: number): void {
    this.attempt = attempt;
  }

  facade(): DeploymentFacade {
    return {
      currentAlias: (alias) => {
        this.record("currentAlias", alias, null);
        return this.scenario.currentAlias.alias === alias ? this.scenario.currentAlias : null;
      },
      rolloutLedger: (alias) => {
        this.record("rolloutLedger", alias, null);
        return this.scenario.rolloutLedger.filter((entry) => entry.alias === alias);
      },
      evalStream: (alias) => {
        this.record("evalStream", alias, null);
        return this.scenario.evalStream.filter((sample) => sample.alias === alias);
      },
      baseline: (version) => {
        this.record("baseline", version, null);
        return this.scenario.baseline.version === version ? this.scenario.baseline : null;
      },
      applyRolloutDecision: (actionId, effect) => {
        this.record("applyRolloutDecision", effect.idempotencyKey, actionId);
        this.seq += 1;
        this.effects.push({
          seq: this.seq,
          attempt: this.attempt,
          actionId,
          effect: this.sealEffect(actionId, effect),
        });
        return { ok: true, effectId: expectedEffectId(this.scenario.view.request, effect.decision) };
      },
    };
  }

  sealedCalls(): readonly DeploymentCall[] {
    return this.calls.map((call) => ({ ...call }));
  }

  sealedEffects(): readonly EffectRecord[] {
    return this.effects.map((record) => ({ ...record, effect: { ...record.effect } }));
  }

  private sealEffect(actionId: string, effect: RolloutEffectRequest): EffectRecord["effect"] {
    return { actionId, ...effect };
  }

  private record(method: DeploymentCall["method"], id: string, actionId: string | null): void {
    this.seq += 1;
    this.calls.push({ seq: this.seq, attempt: this.attempt, method, id, actionId });
  }
}

export function runCell(scenario: Scenario, subject: Subject): CellResult {
  const deployment = new DeploymentHarness(scenario);
  const reports: SubjectReport[] = [];
  try {
    for (let attempt = 0; attempt < scenario.params.repeatCount; attempt += 1) {
      deployment.beginAttempt(attempt);
      reports.push(subject.run(withAttempt(scenario, attempt), deployment.facade()));
    }
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: verify({
        scenario,
        reports,
        effects: deployment.sealedEffects(),
        calls: deployment.sealedCalls(),
      }),
      crashed: null,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: [{ check: "deterministic_result", detail: `subject threw: ${(err as Error).message}` }],
      crashed: (err as Error).message,
    };
  }
}

export function runFamily(subjects: readonly Subject[] = ALL_SUBJECTS): RunResult {
  const space = enumerateSpace();
  const scenarios = generateScenarios(selectMeasuredSet(space));
  const cells: CellResult[] = [];
  for (const subject of subjects) {
    resetCompletionRecords();
    for (const scenario of scenarios) cells.push(runCell(scenario, subject));
  }
  return { scenarios, subjects, cells, spaceSize: space.length };
}

export function toMatrix(run: RunResult): Matrix {
  const graded = run.subjects.filter((s) => s.id !== "reference");
  const byCell = new Map(run.cells.map((cell) => [`${cell.scenarioId}|${cell.subjectId}`, cell]));
  const results: Record<string, Record<string, { failed: string[] } | null>> = {};
  for (const scenario of run.scenarios) {
    const row: Record<string, { failed: string[] } | null> = {};
    for (const subject of graded) {
      const cell = byCell.get(`${scenario.id}|${subject.id}`);
      row[subject.id] = { failed: [...new Set((cell?.failures ?? []).map((f) => f.check))].sort() };
    }
    results[scenario.id] = row;
  }

  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "deployment-model-alias-rollout-drift",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      checks_declared: [...CHECKS],
      extracted_from: [
        "src/families/deployment-model-alias-rollout-drift/runner.ts (in-process sweep)",
        "src/families/deployment-model-alias-rollout-drift/verify.ts (rollout-ledger grading)",
      ],
      caveat:
        "This family was selected by lineage reallocation after the access-token authority branch passed two OpenAI smoke trials. Its local matrix is mutant-detection evidence, not real-agent difficulty. A counted smoke trial is required before claiming agents struggle with it.",
    },
    reference_subject: "reference",
    subjects: graded.map((s) => ({
      id: s.id,
      label: s.label,
      family: BASELINES.includes(s.id as never) ? "baseline" : "mutant",
      model: null,
      effort: null,
      note: INTENDED_CHECK[s.id] ?? null,
    })),
    instances: run.scenarios.map((s) => ({
      id: s.id,
      schedule: `${s.params.currentVersionState}/${s.params.rolloutPhase}/${s.params.canaryWindow}/${s.params.regressionSeverity}/${s.params.evalMix}`,
      seed: s.params.seed,
      keys: s.params.repeatCount,
      family: s.params.currentVersionState,
      source: "generated",
      note: `${s.params.cacheState}/${s.params.providerDisagreement}/${s.params.surface}`,
    })),
    results,
  });
}

export const referenceFailures = (run: RunResult): readonly CellResult[] =>
  run.cells.filter((c) => c.subjectId === "reference" && c.failures.length > 0);

export { BASELINES, INTENDED_CHECK };
