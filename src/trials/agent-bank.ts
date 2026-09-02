// Turning counted agent trials into a matrix — the AGENT bank for a family.
//
// Until now a family had one matrix, built from its mutants, and the reports had to keep explaining
// in prose that its axis count was a statement about detection rather than difficulty. With counted
// trials on disk a second matrix exists: same instances, different subjects, and it is the one that
// answers the question everyone actually asks.
//
// Keeping them as two matrices rather than one merged matrix is the whole point. They have different
// subject populations, they support different claims, and merging them would produce a number that
// means neither thing. `bank.ts` refuses to compare across kinds for the same reason.
//
// A subject here is a MODEL, not a run. Three trials by the same model are three samples of one
// subject, and the cell is the union of what those samples failed — a model that fails a scenario in
// one attempt out of three is a model that can fail it, which is what a catch set is asking.

import { parseMatrix } from "../matrix.js";
import type { Matrix } from "../types.js";
import { normalizeSubjectId } from "./bank.js";
import type { TrialRecord } from "./types.js";

export interface AgentBankOptions {
  readonly familyId: string;
  /** Instance ids the family declares, so a partially-graded trial is visibly partial. */
  readonly instanceIds: readonly string[];
  readonly caveat: string;
}

export interface AgentBank {
  readonly familyId: string;
  readonly matrix: Matrix;
  readonly subjects: readonly string[];
  readonly trialsPerSubject: Readonly<Record<string, number>>;
  /** Cells left null because no counted trial graded that scenario for that subject. */
  readonly unmeasured: number;
}

/**
 * Build the agent bank from counted trial records.
 *
 * Union semantics across repeated trials of one model, and NULL — not "passed" — where no trial
 * graded a scenario. Imputing a pass for an ungraded cell is the single most common way a benchmark
 * flatters itself: it makes partially-measured subjects look identical to each other and collapses
 * the catch sets that would have distinguished them.
 */
export function buildAgentBank(records: readonly TrialRecord[], options: AgentBankOptions): AgentBank {
  const counted = records.filter((r) => r.counts && r.subjectType === "agent");
  const bySubject = new Map<string, TrialRecord[]>();
  for (const record of counted) {
    const id = normalizeSubjectId(record.subjectId);
    bySubject.set(id, [...(bySubject.get(id) ?? []), record]);
  }
  const subjects = [...bySubject.keys()].sort();

  const results: Record<string, Record<string, { failed: string[] } | null>> = {};
  let unmeasured = 0;
  for (const instanceId of options.instanceIds) {
    const row: Record<string, { failed: string[] } | null> = {};
    for (const subject of subjects) {
      const runs = bySubject.get(subject) ?? [];
      const cells = runs.flatMap((r) => r.cells.filter((c) => c.scenarioId === instanceId));
      // A cell the importer marked ungraded is not evidence of a pass. Dropping it here is what makes
      // it a null in the matrix, which the matrix layer already excludes from catch sets rather than
      // imputing as a pass — the same treatment a scenario no trial graded at all receives.
      const graded = cells.filter((c) => c.unmeasured === undefined);
      if (graded.length === 0) {
        row[subject] = null;
        unmeasured += 1;
        continue;
      }
      row[subject] = { failed: [...new Set(graded.flatMap((c) => c.failed))].sort() };
    }
    results[instanceId] = row;
  }

  const matrix = parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: `${options.familyId}:agents`,
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${options.instanceIds.length} instances / ${subjects.length} model subject(s) / ${counted.length} counted trial(s)`,
      checks_total: options.instanceIds.length,
      // A trial bank inherits whatever checks its family declared; the bank itself declares none.
      checks_declared: null,
      extracted_from: counted.map((r) => `trials/${options.familyId}/${r.runId}`),
      caveat: options.caveat,
    },
    reference_subject: null,
    subjects: subjects.map((id) => ({
      id,
      label: id,
      family: "agent",
      model: id,
      effort: null,
      note: `${(bySubject.get(id) ?? []).length} counted trial(s), union of failures`,
    })),
    instances: options.instanceIds.map((id) => ({
      id,
      schedule: null,
      seed: null,
      keys: null,
      family: null,
      source: "agent-trial",
      note: null,
    })),
    results,
  });

  return {
    familyId: options.familyId,
    matrix,
    subjects,
    trialsPerSubject: Object.fromEntries(subjects.map((s) => [s, (bySubject.get(s) ?? []).length])),
    unmeasured,
  };
}
