// The durable trial directory: everything one attempt produced, on disk, re-gradeable later.
//
// A trial that exists only as a row in a table is a trial you cannot re-grade. The verifier WILL
// change — the source project revised its suite twice and could re-score every preserved engine
// against the new one precisely because it had kept them. A number without its artifact is a claim
// that expires the moment the grader moves.
//
// So the unit on disk is a directory, and the layout is fixed:
//
//   trials/<family-id>/<run-id>/
//     metadata.json        who ran, which model, when, how long, what it cost
//     challenge/           the EXACT package the subject was given
//     submission/          what it produced
//     transcript.txt       stdout + stderr, verbatim
//     verifier-output.json the graded cells
//     result.json          the normalized TrialRecord
//     countability.json    the counting judgement and its justification
//
// `challenge/` is copied in rather than referenced. It costs a few kilobytes and it answers the
// question that otherwise cannot be answered a month later: was this subject given the same task the
// next one was? A run whose challenge has drifted is not comparable, and `TRIALDIR_SET_MISMATCH`
// catches it.
//
// The validator is the point of the module. Four rules, each one closing a way a directory can look
// complete while being uncountable.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fail } from "../foundry/schema.js";
import type { TrialRecord } from "./types.js";
import { parseTrialRecord } from "./validate.js";

export const TRIAL_FILES = {
  metadata: "metadata.json",
  transcript: "transcript.txt",
  verifier: "verifier-output.json",
  result: "result.json",
  countability: "countability.json",
} as const;

export const CHALLENGE_DIR = "challenge";
export const SUBMISSION_DIR = "submission";

/** Files that must never appear inside a trial's `challenge/` copy. */
export const HIDDEN_IN_CHALLENGE = [
  "verify.ts",
  "policy.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "matrix.json",
  "scenarios.json",
] as const;

export interface Countability {
  readonly counts: boolean;
  readonly reason: string;
  /** The classified outcome, before any judgement about whether it counts. */
  readonly classification: string;
}

export interface TrialDirectory {
  readonly path: string;
  readonly runId: string;
  readonly familyId: string;
  readonly record: TrialRecord;
  readonly countability: Countability;
  readonly submissionFiles: readonly string[];
}

const listFiles = (dir: string, prefix = ""): readonly string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? listFiles(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
      )
    : [];

export interface WriteTrialInput {
  readonly root: string;
  readonly familyId: string;
  readonly runId: string;
  readonly record: TrialRecord;
  readonly countability: Countability;
  readonly transcript: string;
  readonly challengeFiles: readonly { readonly path: string; readonly content: string }[];
  readonly submissionFiles: readonly { readonly path: string; readonly content: string }[];
  readonly verifierOutput: unknown;
  readonly metadata: Record<string, unknown>;
}

/** Write a complete trial directory. Everything the run produced, nothing inferred. */
export function writeTrialDirectory(input: WriteTrialInput): string {
  const dir = join(input.root, input.familyId, input.runId);
  mkdirSync(join(dir, CHALLENGE_DIR), { recursive: true });
  mkdirSync(join(dir, SUBMISSION_DIR), { recursive: true });

  for (const f of input.challengeFiles) {
    const target = join(dir, CHALLENGE_DIR, f.path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, f.content, "utf8");
  }
  for (const f of input.submissionFiles) {
    const target = join(dir, SUBMISSION_DIR, f.path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, f.content, "utf8");
  }

  const write = (name: string, value: unknown) =>
    writeFileSync(
      join(dir, name),
      typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );

  write(TRIAL_FILES.metadata, input.metadata);
  write(TRIAL_FILES.transcript, input.transcript);
  write(TRIAL_FILES.verifier, input.verifierOutput);
  write(TRIAL_FILES.result, input.record);
  write(TRIAL_FILES.countability, input.countability);
  return dir;
}

/**
 * Validate a trial directory and return it normalized.
 *
 * The rules, and what each one stops:
 *
 *   TRIALDIR_MISSING_FILE               a partially-written directory read as a complete run
 *   TRIALDIR_COUNTED_WITHOUT_VERIFIER   a counted trial whose grading never happened. This is the
 *                                       one that matters: without it, "counts: true" plus an empty
 *                                       verifier file is a pass nobody graded.
 *   TRIALDIR_COUNTED_WITHOUT_SUBMISSION a counted trial with no artifact, so nothing to re-grade
 *   TRIALDIR_CHALLENGE_LEAK             the answer key was inside the package the subject received
 */
export function readTrialDirectory(dir: string): TrialDirectory {
  for (const name of Object.values(TRIAL_FILES)) {
    if (!existsSync(join(dir, name))) {
      fail("TRIALDIR_MISSING_FILE", `${dir}/${name}`, "absent; a partial directory is not a trial");
    }
  }

  const record = parseTrialRecord(
    JSON.parse(readFileSync(join(dir, TRIAL_FILES.result), "utf8")),
    `${dir}/${TRIAL_FILES.result}`,
  );
  const countability = JSON.parse(readFileSync(join(dir, TRIAL_FILES.countability), "utf8")) as Countability;

  const challengeFiles = listFiles(join(dir, CHALLENGE_DIR));
  for (const f of challengeFiles) {
    const base = f.split("/").pop() ?? f;
    if ((HIDDEN_IN_CHALLENGE as readonly string[]).includes(base)) {
      fail(
        "TRIALDIR_CHALLENGE_LEAK",
        `${dir}/${CHALLENGE_DIR}/${f}`,
        "the subject was given a hidden artifact; this run measured transcription, not capability",
      );
    }
  }

  const submissionFiles = listFiles(join(dir, SUBMISSION_DIR));

  if (record.counts) {
    const verifierRaw = readFileSync(join(dir, TRIAL_FILES.verifier), "utf8").trim();
    let cells: unknown;
    try {
      cells = JSON.parse(verifierRaw);
    } catch {
      cells = null;
    }
    const graded = Array.isArray((cells as { cells?: unknown[] } | null)?.cells)
      ? ((cells as { cells: unknown[] }).cells satisfies unknown[])
      : [];
    if (graded.length === 0) {
      fail(
        "TRIALDIR_COUNTED_WITHOUT_VERIFIER",
        `${dir}/${TRIAL_FILES.verifier}`,
        "a counted trial whose verifier produced nothing is a pass nobody graded",
      );
    }
    if (submissionFiles.length === 0) {
      fail(
        "TRIALDIR_COUNTED_WITHOUT_SUBMISSION",
        `${dir}/${SUBMISSION_DIR}`,
        "a counted trial with no artifact cannot be re-graded when the verifier changes",
      );
    }
  }

  return {
    path: dir,
    runId: record.runId,
    familyId: record.familyId,
    record,
    countability,
    submissionFiles,
  };
}

/** Read every trial directory for a family, sorted by run id for determinism. */
export function readFamilyTrials(root: string, familyId: string): readonly TrialDirectory[] {
  const base = join(root, familyId);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => readTrialDirectory(join(base, name)));
}

/** Trials are only comparable when they were graded on the same scenario set. */
export function assertComparable(trials: readonly TrialDirectory[]): void {
  const sets = new Set(trials.filter((t) => t.record.counts).map((t) => t.record.scenarioSetId));
  if (sets.size > 1) {
    fail(
      "TRIALDIR_SET_MISMATCH",
      "trials",
      `counted trials span ${sets.size} scenario sets (${[...sets].join(", ")}); comparing them would compare two different suites`,
    );
  }
}
