// Loading and validating a matrix, with one opinion: a malformed matrix is a hard failure, never a
// silently-repaired one.
//
// Every repair this loader could plausibly perform -- defaulting a missing cell to "passed",
// dropping a subject that appears in `results` but not in `subjects`, coercing a missing
// `reference_subject` -- moves the diversity number in the flattering direction. A missing cell read
// as a pass makes instances look more alike, which inflates redundancy; a stray subject silently
// dropped removes a column that might have been the only thing separating two instances. So the
// loader refuses instead, and says which key was wrong.
//
// The one thing it does NOT check is whether the numbers mean anything. A matrix whose subjects were
// selected against its own instances loads fine and reports fine. That is what `provenance.caveat`
// is for, and why the reporter prints it whether or not the author wants it printed.

import type { Cell, Matrix, Provenance } from "./types.js";

export class MatrixError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "MatrixError";
    this.code = code;
  }
}

const fail = (code: string, message: string): never => {
  throw new MatrixError(code, message);
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown, where: string): string =>
  typeof v === "string" ? v : fail("E_TYPE", `${where}: expected string, got ${typeof v}`);

const strOrNull = (v: unknown, where: string): string | null =>
  v === null || v === undefined ? null : str(v, where);

const numOrNull = (v: unknown, where: string): number | null =>
  v === null || v === undefined
    ? null
    : typeof v === "number"
      ? v
      : fail("E_TYPE", `${where}: expected number`);

const strArray = (v: unknown, where: string): readonly string[] =>
  Array.isArray(v) ? v.map((x, i) => str(x, `${where}[${i}]`)) : fail("E_TYPE", `${where}: expected array`);

function parseProvenance(v: unknown): Provenance {
  const p = isRecord(v) ? v : fail("E_SHAPE", "provenance: expected object");
  if (!("caveat" in p)) {
    fail(
      "E_NO_CAVEAT",
      "provenance.caveat is required. State how subjects were selected relative to instances, " +
        "or set it to null to assert explicitly that they were independent.",
    );
  }
  return {
    repo: strOrNull(p["repo"], "provenance.repo"),
    artifact_commit: strOrNull(p["artifact_commit"], "provenance.artifact_commit"),
    task_sha256: strOrNull(p["task_sha256"], "provenance.task_sha256"),
    suite_shape: strOrNull(p["suite_shape"], "provenance.suite_shape"),
    checks_total: numOrNull(p["checks_total"], "provenance.checks_total"),
    checks_declared:
      p["checks_declared"] === undefined || p["checks_declared"] === null
        ? null
        : strArray(p["checks_declared"], "provenance.checks_declared"),
    extracted_from:
      p["extracted_from"] === undefined ? [] : strArray(p["extracted_from"], "provenance.extracted_from"),
    caveat: strOrNull(p["caveat"], "provenance.caveat"),
  };
}

function parseCell(v: unknown, where: string): Cell | null {
  if (v === null || v === undefined) return null;
  const c = isRecord(v) ? v : fail("E_SHAPE", `${where}: expected object or null`);
  return { failed: strArray(c["failed"], `${where}.failed`) };
}

/** Parse and fully validate a matrix document. Throws `MatrixError` on any inconsistency. */
export function parseMatrix(doc: unknown): Matrix {
  const d = isRecord(doc) ? doc : fail("E_SHAPE", "matrix: expected object");

  const schema = str(d["schema"], "schema");
  if (!schema.startsWith("agent-eval-foundry/matrix@")) {
    fail("E_SCHEMA", `unsupported schema "${schema}"; expected agent-eval-foundry/matrix@1`);
  }

  const rawSubjects = Array.isArray(d["subjects"])
    ? d["subjects"]
    : fail("E_SHAPE", "subjects: expected array");
  const subjects = rawSubjects.map((s, i) => {
    const o = isRecord(s) ? s : fail("E_SHAPE", `subjects[${i}]: expected object`);
    return {
      id: str(o["id"], `subjects[${i}].id`),
      label: strOrNull(o["label"], `subjects[${i}].label`) ?? str(o["id"], `subjects[${i}].id`),
      family: strOrNull(o["family"], `subjects[${i}].family`) ?? "unknown",
      model: strOrNull(o["model"], `subjects[${i}].model`),
      effort: strOrNull(o["effort"], `subjects[${i}].effort`),
      note: strOrNull(o["note"], `subjects[${i}].note`),
    };
  });

  const rawInstances = Array.isArray(d["instances"])
    ? d["instances"]
    : fail("E_SHAPE", "instances: expected array");
  const instances = rawInstances.map((s, i) => {
    const o = isRecord(s) ? s : fail("E_SHAPE", `instances[${i}]: expected object`);
    return {
      id: str(o["id"], `instances[${i}].id`),
      schedule: strOrNull(o["schedule"], `instances[${i}].schedule`) ?? str(o["id"], `instances[${i}].id`),
      seed: numOrNull(o["seed"], `instances[${i}].seed`),
      keys: numOrNull(o["keys"], `instances[${i}].keys`),
      family: strOrNull(o["family"], `instances[${i}].family`) ?? "unknown",
      source: strOrNull(o["source"], `instances[${i}].source`),
      note: strOrNull(o["note"], `instances[${i}].note`),
    };
  });

  const subjectIds = new Set(subjects.map((s) => s.id));
  if (subjectIds.size !== subjects.length) fail("E_DUP", "duplicate subject id");
  const instanceIds = new Set(instances.map((s) => s.id));
  if (instanceIds.size !== instances.length) fail("E_DUP", "duplicate instance id");

  const rawResults = isRecord(d["results"]) ? d["results"] : fail("E_SHAPE", "results: expected object");
  const results: Record<string, Record<string, Cell | null>> = {};

  for (const inst of instances) {
    const row = rawResults[inst.id];
    if (row === undefined) fail("E_MISSING_ROW", `results is missing instance "${inst.id}"`);
    const r = isRecord(row) ? row : fail("E_SHAPE", `results["${inst.id}"]: expected object`);
    const parsed: Record<string, Cell | null> = {};
    for (const sid of Object.keys(r)) {
      if (!subjectIds.has(sid)) {
        fail(
          "E_UNKNOWN_SUBJECT",
          `results["${inst.id}"] mentions subject "${sid}" not declared in subjects[]`,
        );
      }
      parsed[sid] = parseCell(r[sid], `results["${inst.id}"]["${sid}"]`);
    }
    for (const s of subjects) {
      if (!(s.id in parsed)) {
        fail(
          "E_MISSING_CELL",
          `results["${inst.id}"] has no entry for subject "${s.id}". Write null to record that it was not measured; an omitted cell is not the same as a pass.`,
        );
      }
    }
    results[inst.id] = parsed;
  }

  for (const iid of Object.keys(rawResults)) {
    if (!instanceIds.has(iid))
      fail("E_UNKNOWN_INSTANCE", `results mentions instance "${iid}" not declared in instances[]`);
  }

  const reference = strOrNull(d["reference_subject"], "reference_subject");
  if (reference !== null && subjectIds.has(reference)) {
    fail(
      "E_REFERENCE_IN_SUBJECTS",
      `reference_subject "${reference}" also appears in subjects[]. The oracle is not evidence about difficulty and must not be graded as a subject.`,
    );
  }

  return {
    schema,
    suite: str(d["suite"], "suite"),
    provenance: parseProvenance(d["provenance"]),
    reference_subject: reference,
    subjects,
    instances,
    results,
  };
}
