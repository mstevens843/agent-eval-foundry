// Producing trial records: locally from checked-in subjects, or by importing an agent's attempt.
//
// Both paths emit the SAME `TrialRecord`. That is the whole design. A reference sweep, a mutant
// bank and a frontier-model attempt become comparable rows in one table, and the ship gate reads
// that table rather than reading three different formats and hoping they line up.
//
// The import path is the one that matters most and it is deliberately unautomated. Running a
// frontier model needs credentials, money and a container this repository does not have, so the
// honest move is a rigorous ingestion path rather than a fake runner: run the model wherever you
// actually can, preserve the artifact, and import it here where the counting rules are enforced.
// `plans/prompt-injection-agent-trials.md` is the executable half of that.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildChallengePackage } from "../challenge/package.js";
import { MUTANTS } from "../families/prompt-injection-containment/mutants.js";
import { reference } from "../families/prompt-injection-containment/reference.js";
import {
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "../families/prompt-injection-containment/scenarios.js";
import type { Scenario, Subject } from "../families/prompt-injection-containment/types.js";
import { verify } from "../families/prompt-injection-containment/verify.js";
import { fail, isRecord, numNullable, optionalText, str, strNullable } from "../foundry/schema.js";
import { type OrchestrateResult, PIC_INSTRUCTION, orchestrateTrial } from "./orchestrator.js";
import { type SubjectRunner, inProcessRunner, subprocessRunner } from "./runners.js";
import type { IsolationLevel, SubjectType, TrialCell, TrialRecord, TrialSet } from "./types.js";
import { parseTrialRecord } from "./validate.js";

export const FAMILY_ID = "prompt-injection-containment";

/** Identifies the exact scenario set a trial was graded on, so records cannot drift against it. */
export function scenarioSetId(scenarios: readonly Scenario[]): string {
  // Content-addressed by the ids themselves: a changed selection changes the id, which invalidates
  // every trial recorded against the old one rather than silently comparing across two suites.
  let hash = 5381;
  for (const s of scenarios) {
    for (let i = 0; i < s.id.length; i += 1) hash = ((hash << 5) + hash + s.id.charCodeAt(i)) >>> 0;
  }
  return `pic-${scenarios.length}-${hash.toString(16)}`;
}

export const measuredScenarios = (): readonly Scenario[] =>
  generateScenarios(selectMeasuredSet(enumerateSpace()));

function gradeWithRunner(
  scenarios: readonly Scenario[],
  runner: SubjectRunner,
): { cells: TrialCell[]; errors: number } {
  const cells: TrialCell[] = [];
  let errors = 0;
  for (const scenario of scenarios) {
    const outcome = runner.run(scenario);
    if (outcome.error !== null) {
      errors += 1;
      cells.push({ scenarioId: scenario.id, failed: [SUBJECT_ERROR] });
      continue;
    }
    const failures = verify({ scenario, ledger: outcome.ledger, report: outcome.report });
    cells.push({
      scenarioId: scenario.id,
      failed: [...new Set(failures.map((f) => f.check))].sort(),
    });
  }
  return { cells, errors };
}

export interface LocalRunOptions {
  readonly isolation?: IsolationLevel;
  /** Module paths for subprocess-isolated subjects, keyed by subject id. */
  readonly modulePaths?: Readonly<Record<string, string>>;
}

const typeOf = (id: string): SubjectType =>
  id === "reference" ? "reference" : id === "nop-faker" || id === "over-blocker" ? "baseline" : "mutant";

/** Run every checked-in subject and emit trial records. */
export function runLocalTrials(options: LocalRunOptions = {}): TrialSet {
  const scenarios = measuredScenarios();
  const setId = scenarioSetId(scenarios);
  const subjects: readonly Subject[] = [reference, ...MUTANTS];
  const isolation = options.isolation ?? "in-process";

  const records = subjects.map((subject): TrialRecord => {
    const modulePath = options.modulePaths?.[subject.id];
    const runner =
      isolation === "subprocess" && modulePath !== undefined
        ? subprocessRunner({ modulePath })
        : inProcessRunner(subject);
    const { cells, errors } = gradeWithRunner(scenarios, runner);
    const failed = cells.filter((c) => c.failed.length > 0).length;
    return {
      runId: `local-${subject.id}`,
      familyId: FAMILY_ID,
      subjectId: subject.id,
      subjectType: typeOf(subject.id),
      model: null,
      effort: null,
      status: errors === cells.length ? "crashed" : "completed",
      // Local subjects always count: they are the verifier's own grading population. They are also
      // never AGENT trials, so they can never satisfy the difficulty gate — which is the distinction
      // this whole layer exists to keep visible.
      counts: true,
      countsReason:
        "local subject checked into this repository; graded to validate the verifier, never to evidence difficulty",
      scenarioSetId: setId,
      cells,
      runtimeSeconds: null,
      costUsd: 0,
      artifactPath: `src/families/prompt-injection-containment/${subject.id === "reference" ? "reference.ts" : "mutants.ts"}`,
      isolation: runner.isolation,
      notes: `${failed}/${cells.length} scenarios failed via ${runner.describe}`,
    };
  });

  return { familyId: FAMILY_ID, scenarioSetId: setId, records };
}

// ---------------------------------------------------------------- manual agent import

export interface AgentTrialMetadata {
  readonly runId: string;
  readonly subjectId: string;
  readonly model: string;
  readonly effort: string | null;
  readonly status: string;
  readonly counts: boolean;
  readonly countsReason: string;
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
  readonly notes: string;
}

/**
 * Import one agent attempt from a directory.
 *
 * Expected layout:
 *   <dir>/metadata.json     model, run id, status, counting judgement, cost, runtime
 *   <dir>/subject.mjs       the submitted artifact (optional if the run never produced one)
 *
 * The artifact is executed under SUBPROCESS isolation, never in-process. That is not configurable:
 * an agent-written module must not run in the same memory as the thing grading it.
 */
export function importAgentTrial(dir: string): TrialRecord {
  const metaPath = join(dir, "metadata.json");
  if (!existsSync(metaPath)) {
    throw new Error(`${dir}: no metadata.json. An imported trial must describe the run that produced it.`);
  }
  const raw: unknown = JSON.parse(readFileSync(metaPath, "utf8"));
  const o = isRecord(raw) ? raw : fail("E_SHAPE", metaPath, "expected an object");

  const scenarios = measuredScenarios();
  const setId = scenarioSetId(scenarios);
  const status = str(o["status"], `${metaPath}.status`);
  const counts = o["counts"] === true;

  const artifact = join(dir, "subject.mjs");
  const hasArtifact = existsSync(artifact);

  // Only grade when the run actually produced something AND the importer says it counts. A refusal
  // with a stray artifact must not be silently graded into a zero.
  const cells: TrialCell[] =
    counts && hasArtifact ? gradeWithRunner(scenarios, subprocessRunner({ modulePath: artifact })).cells : [];

  return parseTrialRecord(
    {
      runId: str(o["runId"], `${metaPath}.runId`),
      familyId: FAMILY_ID,
      subjectId: str(o["subjectId"], `${metaPath}.subjectId`),
      subjectType: "agent",
      model: strNullable(o["model"], `${metaPath}.model`),
      effort: strNullable(o["effort"], `${metaPath}.effort`),
      status,
      counts,
      countsReason: strNullable(o["countsReason"], `${metaPath}.countsReason`),
      scenarioSetId: setId,
      cells,
      runtimeSeconds: numNullable(o["runtimeSeconds"], `${metaPath}.runtimeSeconds`),
      costUsd: numNullable(o["costUsd"], `${metaPath}.costUsd`),
      artifactPath: hasArtifact ? artifact : null,
      isolation: "subprocess",
      notes: optionalText(o["notes"], `${metaPath}.notes`),
    },
    metaPath,
  );
}

/** Import every trial directory under `root`, sorted for determinism. */
export function importAgentTrials(root: string): readonly TrialRecord[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => importAgentTrial(join(root, name)));
}

// ---------------------------------------------------------------- running a real agent trial

/**
 * Grade an agent-submitted module. Subprocess-isolated, always.
 *
 * Exported so the orchestrator can be handed a family grader without knowing anything about this
 * family, and so the CLI's `trials run` path and the checked-in trials are graded by identical code.
 */
export function gradeSubmission(modulePath: string): { cells: readonly TrialCell[]; detail: string } {
  const scenarios = measuredScenarios();
  const { cells, errors } = gradeWithRunner(scenarios, subprocessRunner({ modulePath }));
  const failed = cells.filter((c) => c.failed.length > 0).length;
  return {
    cells,
    detail: `${failed}/${cells.length} scenarios failed (${errors} subject errors) under subprocess isolation`,
  };
}

export interface AgentTrialOptions {
  readonly root: string;
  readonly runId: string;
  readonly provider: string;
  readonly model: string;
  readonly subjectId: string;
  readonly effort?: string | null;
  readonly command?: readonly string[];
  readonly timeoutMs?: number;
  readonly inheritEnv?: boolean;
  readonly costUsd?: number | null;
}

/**
 * Build the challenge package, hand it to a provider, grade whatever comes back, and write a durable
 * trial directory.
 *
 * The challenge is rebuilt from the family rather than copied from `examples/`, so a trial can never
 * be run against a stale package — and the package builder is the same one whose output is diffed by
 * `verify`, which is what makes "the model saw exactly this" a checkable claim rather than a promise.
 */
export function runAgentTrial(options: AgentTrialOptions): OrchestrateResult {
  const typesSource = readFileSync(
    join(options.root, "src/families/prompt-injection-containment/types.ts"),
    "utf8",
  );
  const scenarios = measuredScenarios();
  const setId = scenarioSetId(scenarios);
  const pkg = buildChallengePackage(typesSource, setId);

  const challengeDir = mkdtempSync(join(tmpdir(), "foundry-challenge-"));
  for (const file of pkg.files) {
    const dest = join(challengeDir, file.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, file.content, "utf8");
  }

  return orchestrateTrial({
    familyId: FAMILY_ID,
    runId: options.runId,
    challengeDir,
    trialsRoot: join(options.root, "trials"),
    instruction: PIC_INSTRUCTION,
    provider: options.provider,
    model: options.model,
    effort: options.effort ?? null,
    subjectId: options.subjectId,
    scenarioSetId: setId,
    timeoutMs: options.timeoutMs ?? 900_000,
    ...(options.command === undefined ? {} : { command: options.command }),
    ...(options.inheritEnv === undefined ? {} : { inheritEnv: options.inheritEnv }),
    costUsd: options.costUsd ?? null,
    grade: gradeSubmission,
    disqualify: baselineDisqualifier(),
  });
}

// ---------------------------------------------------------------- baseline indistinguishability

/**
 * A content signature for a trial's graded cells: which scenarios failed, and on which checks.
 *
 * Two subjects with the same signature are indistinguishable to this suite. That is the property
 * the disqualifier below turns on, and it is exact rather than thresholded — no "close enough".
 */
/** The check the grader records when the subject host could not run the artifact at all. */
export const SUBJECT_ERROR = "subject_error";

export function cellSignature(cells: readonly TrialCell[]): string {
  return [...cells]
    .sort((a, b) => a.scenarioId.localeCompare(b.scenarioId))
    .map((c) => `${c.scenarioId}:${[...c.failed].sort().join("+")}`)
    .join("|");
}

/** Signatures of the checked-in baselines — the subjects this repository wrote to do nothing useful. */
export function baselineSignatures(): Readonly<Record<string, string>> {
  const local = runLocalTrials();
  return Object.fromEntries(
    local.records
      .filter((r) => r.subjectType === "baseline")
      .map((r) => [r.subjectId, cellSignature(r.cells)]),
  );
}

/**
 * The guard that a smoke test found, before a real trial could exploit it.
 *
 * `trials run` will happily drive any command, and a command that writes a five-line do-nothing
 * module produces a trial that fails all 128 scenarios. That record then satisfies the blocking
 * `not-already-solved` gate — "an agent attempted this family and did not pass" — and the family
 * flips from NOT-READY to SHIP on the strength of a stub. Running the smoke test did exactly that.
 *
 * The rule that closes it is the same one the counting rules already use everywhere else: the
 * absence of an attempt is not a result. A submission whose behaviour is byte-identical to a
 * checked-in baseline is not an attempt, whoever or whatever produced it, so it does not count.
 *
 * A genuinely bad model that produces a genuinely bad implementation still counts — it has to
 * differ from the baseline in at least one cell, and any real implementation does.
 */
export function baselineDisqualifier(): (cells: readonly TrialCell[]) => string | null {
  const signatures = baselineSignatures();
  return (cells) => {
    if (cells.length === 0) return null;

    // Case one, found first by the smoke test: the artifact never ran. Every cell failed on
    // `subject_error`, which means the subprocess host could not even import and drive it. That is
    // a broken file, not an implementation, and it is indistinguishable from submitting nothing.
    if (cells.every((c) => c.failed.length === 1 && c.failed[0] === SUBJECT_ERROR)) {
      return `the submission failed to run at all: every one of the ${cells.length} scenarios errored inside the subject host. A file that never executes is the absence of an attempt, not a measured failure.`;
    }

    // Case two: it ran, and behaved exactly like a subject this repository wrote to do nothing.
    const sig = cellSignature(cells);
    const match = Object.entries(signatures).find(([, s]) => s === sig);
    return match === undefined
      ? null
      : `the submission is indistinguishable from the checked-in \`${match[0]}\` baseline: identical failures on all ${cells.length} scenarios. An artifact that does nothing is the absence of an attempt, not a measured failure.`;
  };
}

/** The checker half: independently reject counted agent records that match a baseline. */
export function assertNoBaselineImposters(records: readonly TrialRecord[]): void {
  const disqualify = baselineDisqualifier();
  for (const r of records) {
    if (!r.counts || r.subjectType !== "agent") continue;
    const reason = disqualify(r.cells);
    if (reason !== null) {
      fail("TRIAL_BASELINE_IMPOSTER", `trials.${r.runId}`, reason);
    }
  }
}
