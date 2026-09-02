// Trial record validation. The rules here exist to stop one specific move.
//
// The move: run a frontier model, have it refuse at the provider level, record reward 0, and quote
// the zero as evidence the family is hard. It is not a hypothetical — the source project's Codex
// `/cheat` trials refused three times and scored 0.0, and the repository had to say in as many words
// that "that zero means no attack was attempted, not an attack repelled". A refusal is the absence of
// evidence, and the absence of evidence renders identically to a failure unless something refuses to
// let it.
//
// So `TRIAL_REFUSAL_COUNTED` is a hard error, and `counts` can never be justified by silence:
// `countsReason` is required whichever way the flag is set, because deciding a run does NOT count is
// also a judgement someone should have to defend.

import {
  fail,
  isRecord,
  numNullable,
  oneOf,
  optionalText,
  str,
  strArray,
  strNullable,
} from "../foundry/schema.js";
import {
  ISOLATION_LEVELS,
  NEVER_COUNTS,
  SUBJECT_TYPES,
  TRIAL_STATUSES,
  type TrialCell,
  type TrialRecord,
  type TrialSet,
} from "./types.js";

const obj = (v: unknown, path: string): Record<string, unknown> =>
  isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");

const parseCell = (v: unknown, path: string): TrialCell => {
  const o = obj(v, path);
  const cell: TrialCell = {
    scenarioId: str(o["scenarioId"], `${path}.scenarioId`),
    failed: strArray(o["failed"], `${path}.failed`),
  };
  const raw = o["unmeasured"];
  if (raw === undefined || raw === null) return cell;
  const unmeasured = str(raw, `${path}.unmeasured`);
  // "Not graded" and "graded, and these checks failed" are different claims about the same cell.
  // Allowing both would let an importer hedge a fabricated failure, which is the mirror image of the
  // bug this field exists to fix.
  if (cell.failed.length > 0) {
    fail(
      "TRIAL_CELL_UNMEASURED_WITH_FAILURES",
      `${path}.unmeasured`,
      "a cell cannot be both ungraded and carry named failing checks; state one or the other",
    );
  }
  return { ...cell, unmeasured };
};

export function parseTrialRecord(v: unknown, path = "trial"): TrialRecord {
  const o = obj(v, path);
  const status = oneOf(o["status"], `${path}.status`, TRIAL_STATUSES);
  const subjectType = oneOf(o["subjectType"], `${path}.subjectType`, SUBJECT_TYPES);
  const counts =
    typeof o["counts"] === "boolean" ? o["counts"] : fail("E_TYPE", `${path}.counts`, "expected a boolean");

  const countsReason = strNullable(o["countsReason"], `${path}.countsReason`);
  if (countsReason === null) {
    fail(
      "TRIAL_COUNTS_WITHOUT_REASON",
      `${path}.countsReason`,
      "required whether counts is true or false; deciding a run does not count is also a judgement someone should defend",
    );
  }

  if (counts && NEVER_COUNTS.has(status)) {
    fail(
      "TRIAL_REFUSAL_COUNTED",
      `${path}.counts`,
      `status "${status}" can never count toward a difficulty claim — a refusal, timeout or infrastructure failure is the absence of an attempt, and recording it as a zero manufactures evidence`,
    );
  }

  const cells = Array.isArray(o["cells"])
    ? o["cells"].map((c, i) => parseCell(c, `${path}.cells[${i}]`))
    : fail("E_TYPE", `${path}.cells`, "expected an array");

  if (counts && cells.length === 0) {
    fail(
      "TRIAL_EMPTY_CELLS",
      `${path}.cells`,
      "a counting trial with no graded scenarios contributes nothing and cannot be counted",
    );
  }

  const model = strNullable(o["model"], `${path}.model`);
  const artifactPath = strNullable(o["artifactPath"], `${path}.artifactPath`);

  if (subjectType === "agent") {
    if (model === null) {
      fail(
        "TRIAL_AGENT_WITHOUT_MODEL",
        `${path}.model`,
        "an agent trial with no model identifier cannot be reproduced or attributed",
      );
    }
    if (counts && artifactPath === null) {
      fail(
        "TRIAL_AGENT_WITHOUT_ARTIFACT",
        `${path}.artifactPath`,
        "a counting agent trial must preserve the submitted artifact; an unpreserved result cannot be re-graded when the verifier changes",
      );
    }
  }

  return {
    runId: str(o["runId"], `${path}.runId`),
    familyId: str(o["familyId"], `${path}.familyId`),
    subjectId: str(o["subjectId"], `${path}.subjectId`),
    subjectType,
    model,
    effort: strNullable(o["effort"], `${path}.effort`),
    status,
    counts,
    countsReason,
    scenarioSetId: str(o["scenarioSetId"], `${path}.scenarioSetId`),
    cells,
    runtimeSeconds: numNullable(o["runtimeSeconds"], `${path}.runtimeSeconds`),
    costUsd: numNullable(o["costUsd"], `${path}.costUsd`),
    artifactPath,
    isolation: oneOf(o["isolation"], `${path}.isolation`, ISOLATION_LEVELS),
    notes: optionalText(o["notes"], `${path}.notes`),
  };
}

export function parseTrialSet(v: unknown, path = "trials"): TrialSet {
  const o = obj(v, path);
  const records = Array.isArray(o["records"])
    ? o["records"].map((r, i) => parseTrialRecord(r, `${path}.records[${i}]`))
    : fail("E_TYPE", `${path}.records`, "expected an array");

  const seen = new Set<string>();
  for (const r of records) {
    if (seen.has(r.runId)) {
      fail("TRIAL_DUPLICATE_RUN_ID", `${path}.records`, `duplicate runId "${r.runId}"`);
    }
    seen.add(r.runId);
  }

  return {
    familyId: str(o["familyId"], `${path}.familyId`),
    scenarioSetId: str(o["scenarioSetId"], `${path}.scenarioSetId`),
    records,
  };
}

/** Cross-check a trial set against the scenarios it claims to have run. */
export function checkScenarioCoverage(set: TrialSet, knownScenarioIds: readonly string[]): readonly string[] {
  const known = new Set(knownScenarioIds);
  const problems: string[] = [];
  for (const r of set.records) {
    if (!r.counts) continue;
    const unknown = r.cells.filter((c) => !known.has(c.scenarioId)).map((c) => c.scenarioId);
    if (unknown.length > 0) {
      problems.push(
        `${r.runId} graded ${unknown.length} scenario(s) not in the set: ${unknown.slice(0, 3).join(", ")}`,
      );
    }
    const covered = new Set(r.cells.map((c) => c.scenarioId));
    const missing = knownScenarioIds.filter((id) => !covered.has(id));
    if (missing.length > 0) {
      problems.push(`${r.runId} is missing ${missing.length} scenario(s) from the set`);
    }
  }
  return problems;
}
