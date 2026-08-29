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

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
      cells.push({ scenarioId: scenario.id, failed: ["subject_error"] });
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
