import { parseMatrix } from "../../matrix.js";
import type { Matrix } from "../../types.js";
import { BASELINES, INTENDED_CHECK, MUTANTS } from "./mutants.js";
import { reference, resetCompletionRecords } from "./reference.js";
import { enumerateSpace, generateScenarios, selectMeasuredSet } from "./scenarios.js";
import {
  type AuthorityCall,
  type EffectRecord,
  type Scenario,
  expectedEffectId,
  grantFor,
  withAttempt,
} from "./truth.js";
import type { AuthorityFacade, Subject, SubjectReport } from "./types.js";
import { type Failure, verify } from "./verify.js";

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

class AuthorityHarness {
  private seq = 0;
  private attempt = 0;
  private readonly calls: AuthorityCall[] = [];
  private readonly effects: EffectRecord[] = [];

  constructor(private readonly scenario: Scenario) {}

  beginAttempt(attempt: number): void {
    this.attempt = attempt;
  }

  facade(): AuthorityFacade {
    return {
      currentApproval: (id) => {
        this.record("currentApproval", id, null);
        return this.scenario.currentApproval?.id === id ? this.scenario.currentApproval : null;
      },
      currentToken: (id) => {
        this.record("currentToken", id, null);
        return this.scenario.currentToken?.id === id ? this.scenario.currentToken : null;
      },
      issueToken: (actionId, grant) => {
        this.record("issueToken", grant.tokenId, actionId);
        this.seq += 1;
        const effect: EffectRecord = {
          seq: this.seq,
          attempt: this.attempt,
          actionId,
          grant,
        };
        this.effects.push(effect);
        return { ok: true, effectId: expectedEffectId(this.scenario.view.request) };
      },
    };
  }

  sealedCalls(): readonly AuthorityCall[] {
    return this.calls.map((call) => ({ ...call }));
  }

  sealedEffects(): readonly EffectRecord[] {
    return this.effects.map((effect) => ({ ...effect, grant: { ...effect.grant } }));
  }

  private record(method: AuthorityCall["method"], id: string, actionId: string | null): void {
    this.seq += 1;
    this.calls.push({ seq: this.seq, attempt: this.attempt, method, id, actionId });
  }
}

export function runCell(scenario: Scenario, subject: Subject): CellResult {
  const authority = new AuthorityHarness(scenario);
  const reports: SubjectReport[] = [];
  try {
    for (let attempt = 0; attempt < scenario.params.repeatCount; attempt += 1) {
      authority.beginAttempt(attempt);
      reports.push(subject.run(withAttempt(scenario, attempt), authority.facade()));
    }
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: verify({
        scenario,
        reports,
        effects: authority.sealedEffects(),
        calls: authority.sealedCalls(),
      }),
      crashed: null,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: [{ check: "decision_matches_truth", detail: `subject threw: ${(err as Error).message}` }],
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
  const results: Record<string, Record<string, { failed: string[] } | null>> = {};
  for (const scenario of run.scenarios) {
    const row: Record<string, { failed: string[] } | null> = {};
    for (const subject of graded) {
      const cell = run.cells.find((c) => c.scenarioId === scenario.id && c.subjectId === subject.id);
      row[subject.id] = { failed: [...new Set((cell?.failures ?? []).map((f) => f.check))].sort() };
    }
    results[scenario.id] = row;
  }

  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "access-token-scope-expansion",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      extracted_from: [
        "src/families/access-token-scope-expansion/runner.ts (in-process sweep)",
        "src/families/access-token-scope-expansion/verify.ts (authority-ledger grading)",
      ],
      caveat:
        "This family was promoted from a mechanism probe and has local reference/mutant/package evidence only. The axis count is mutant-detection evidence over known-bad subjects, not real-agent difficulty. A counted smoke trial is required before claiming agents struggle with it.",
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
      schedule: `${s.params.approvalDrift}/${s.params.tokenDrift}/${s.params.cacheFreshness}/r${s.params.repeatCount}`,
      seed: s.params.seed,
      keys: s.params.repeatCount,
      family: s.params.approvalDrift,
      source: "generated",
      note: s.params.requestSurface,
    })),
    results,
  });
}

export const referenceFailures = (run: RunResult): readonly CellResult[] =>
  run.cells.filter((c) => c.subjectId === "reference" && c.failures.length > 0);

export { BASELINES, INTENDED_CHECK, grantFor };
