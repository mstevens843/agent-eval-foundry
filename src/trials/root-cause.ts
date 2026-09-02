// The root-cause record: why a trial came out the way it did, written down and attributed.
//
// WHY THIS EXISTS
//
// Two artifacts in this repository were published as difficulty evidence and labelled `capability`
// when neither measured a capability. One was a deployment-alias run whose 192 failures fan out of a
// single root decision the visible package does not determine; the other was a memory-poisoning run
// that failed every attack scenario because the host handed the subject a NEW memory facade per
// session while the package promised the SAME one (`test/memory-facade-contract.test.ts` is the
// probe that now holds that contract). Nothing stopped either. `countedAgentTrials > 0` was the
// whole of the difficulty gate, so a counted trial was difficulty evidence by default, and
// "capability" was what a counted failure silently meant.
//
// This module makes that default impossible. A trial's root cause is a FILE, per trial, and a trial
// with no file reads `unlabelled` — never `capability`.
//
// WHY NOT REUSE `FailureReading` FROM src/reports/diagnosis.ts
//
// Because they are different kinds of claim and collapsing them is the bug, not the fix.
//
//   `FailureReading` is a READING: a statistical shape computed from the failing cells alone —
//   is the failure confined to knob values, does it wipe out one check, do the failing checks nest.
//   It is cheap, automatic, and structurally blind. `harness-contract-violation` and `package-leak`
//   have no shape: the memory-poisoning facade bug produced a textbook "confined to knob values"
//   pattern and read as `capability` on exactly the evidence a reading can see.
//
//   A ROOT CAUSE is an ADJUDICATION: somebody read the artifact, the transcript and the package and
//   said what actually happened. It cannot be derived from the reading, and the reading cannot be
//   derived from it.
//
// So `FailureReading` is reused rather than replaced — it is carried on the record as
// `diagnosisReading`, the machine's input to the adjudication — and the enum below is the
// adjudication's own vocabulary. The one word taken from `FailureReading` is `clean`, with the same
// meaning it already has there: this trial failed nothing, so there is no defect to attribute.
// `repairSuspected` on `TrialDiagnosis` is a boolean derived from the reading and stays where it is;
// it is a hint that a root cause should be read, not a root cause.
//
// THE RULE WITH TEETH
//
// `NEEDS_HUMAN_READ` in diagnosis.ts already names the readings that "must not be quoted as a
// difficulty result without a person reading the transcript". That was documentation. Here it is
// enforced: an AUTOMATED labeller may not write `capability` over a reading that needs a human.
// Both published mistakes were automated `capability` labels over exactly those readings.

import { fail, isRecord, oneOf, str, strArray } from "../foundry/schema.js";
import type { RuleCode } from "../foundry/schema.js";
import { NEEDS_HUMAN_READ } from "../reports/diagnosis.js";
import type { FailureReading } from "../reports/diagnosis.js";
import { cellFailed } from "./types.js";
import type { TrialRecord } from "./types.js";

/**
 * The closed set of root causes. Closed on purpose: an open vocabulary is how "other" becomes the
 * bucket every inconvenient trial lands in.
 */
export const ROOT_CAUSES = [
  /** The agent understood the contract and got the behaviour wrong. The ONLY difficulty evidence. */
  "capability",
  /** A graded behaviour is not derivable from the visible package. */
  "spec-underspecified",
  /** The visible package states something the verifier contradicts. */
  "spec-contradiction",
  /** The runner or host broke a promise the package made. */
  "harness-contract-violation",
  /** The visible package contained the answer. */
  "package-leak",
  /** The run did not measure the subject. */
  "infrastructure",
  /** The trial failed nothing. Same meaning as `clean` in `FailureReading`. */
  "clean",
  /** Nobody has read it yet. The default, and never inferred as anything else. */
  "unlabelled",
] as const;
export type RootCause = (typeof ROOT_CAUSES)[number];

/** Root causes that attribute a FAILURE to something. Meaningless on a trial that failed nothing. */
export const FAILURE_ATTRIBUTING: ReadonlySet<RootCause> = new Set<RootCause>([
  "capability",
  "spec-underspecified",
  "spec-contradiction",
  "harness-contract-violation",
  "package-leak",
]);

/**
 * The only root cause that is difficulty evidence.
 *
 * Everything else is a finding about the family, the harness or the run. Exported as a set of one
 * rather than inlined as `=== "capability"` so that widening it later is a visible edit here rather
 * than a comparison quietly changed at a call site.
 */
export const DIFFICULTY_EVIDENCE_CAUSES: ReadonlySet<RootCause> = new Set<RootCause>(["capability"]);

export const LABELLER_KINDS = ["human", "automated"] as const;
export type LabellerKind = (typeof LABELLER_KINDS)[number];

export interface Labeller {
  readonly kind: LabellerKind;
  /** Who or what. A person, or the named process that produced the label. */
  readonly id: string;
  /** ISO date the label was written. */
  readonly date: string;
}

export interface RootCauseRecord {
  readonly runId: string;
  readonly familyId: string;
  readonly label: RootCause;
  /** Why this label and not the neighbouring one. Prose, and it must say something. */
  readonly rationale: string;
  /** The artifacts the labeller actually opened. Paths relative to the trial directory. */
  readonly evidenceRead: readonly string[];
  readonly labelledBy: Labeller;
  /**
   * The automatic reading at labelling time, when one was computed.
   *
   * Not the label, and not evidence for it: it is what the machine could see, recorded so that a
   * label written over `single-cause-fanout` or `mixed` is visibly a human overriding a hedge
   * rather than a machine asserting through one.
   */
  readonly diagnosisReading: FailureReading | null;
}

export const ROOT_CAUSE_FILE = "root-cause.json";

const ROOT_CAUSE_CODES: readonly RuleCode[] = [
  "ROOTCAUSE_UNKNOWN_LABEL",
  "ROOTCAUSE_NO_RATIONALE",
  "ROOTCAUSE_NO_EVIDENCE",
  "ROOTCAUSE_NO_LABELLER",
  "ROOTCAUSE_RUN_MISMATCH",
  "ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME",
  "ROOTCAUSE_CAPABILITY_OVER_UNREAD_DIAGNOSIS",
];
export const ROOT_CAUSE_RULE_CODES = ROOT_CAUSE_CODES;

/** Shortest rationale that can carry an argument. Below this the field is being filled in, not written. */
const MIN_RATIONALE = 24;

/**
 * The record a trial with no sidecar has.
 *
 * This is the single most important line in the module. It is `unlabelled`, it names no evidence,
 * and its labeller is the absence of one — so nothing downstream can read a missing file as an
 * adjudication that never happened.
 */
export const unlabelledRootCause = (runId: string, familyId: string): RootCauseRecord => ({
  runId,
  familyId,
  label: "unlabelled",
  rationale: "no root-cause record on disk; nobody has read this trial",
  evidenceRead: [],
  labelledBy: { kind: "automated", id: "absent-sidecar-default", date: "" },
  diagnosisReading: null,
});

function parseLabeller(v: unknown, path: string): Labeller {
  if (!isRecord(v)) {
    fail(
      "ROOTCAUSE_NO_LABELLER",
      path,
      "a root cause with no labeller is an anonymous claim; the whole point of the record is that somebody owns it",
    );
  }
  const kind = typeof v["kind"] === "string" ? v["kind"] : "";
  if (!(LABELLER_KINDS as readonly string[]).includes(kind)) {
    fail(
      "ROOTCAUSE_NO_LABELLER",
      `${path}.kind`,
      `expected one of ${LABELLER_KINDS.join(" | ")}; a human read and a machine reading are not interchangeable evidence`,
    );
  }
  const id = typeof v["id"] === "string" && v["id"].trim().length > 0 ? v["id"] : "";
  if (id === "") fail("ROOTCAUSE_NO_LABELLER", `${path}.id`, "the labeller must be named");
  return {
    kind: kind as LabellerKind,
    id,
    date: typeof v["date"] === "string" ? v["date"] : "",
  };
}

export interface ParseRootCauseOptions {
  /** The trial the sidecar sits beside, when there is one to cross-check against. */
  readonly record?: TrialRecord;
}

/**
 * Parse a root-cause sidecar, refusing rather than repairing.
 *
 * The rules, and what each one stops:
 *
 *   ROOTCAUSE_UNKNOWN_LABEL                    a label outside the closed enum — including a
 *                                              plausible-looking synonym, which is how a closed
 *                                              vocabulary becomes an open one
 *   ROOTCAUSE_NO_RATIONALE                     a label with no argument behind it
 *   ROOTCAUSE_NO_EVIDENCE                      a label naming nothing the labeller read
 *   ROOTCAUSE_NO_LABELLER                      an anonymous adjudication
 *   ROOTCAUSE_RUN_MISMATCH                     a record describing a different trial than the one
 *                                              it sits beside — copy-paste across directories
 *   ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME        `capability` on a trial that failed nothing, or
 *                                              `clean` on one that failed something
 *   ROOTCAUSE_CAPABILITY_OVER_UNREAD_DIAGNOSIS an automated `capability` over a reading that
 *                                              diagnosis.ts says needs a person. This is the exact
 *                                              shape of both published mistakes.
 */
export function parseRootCause(
  v: unknown,
  path = "root-cause",
  options: ParseRootCauseOptions = {},
): RootCauseRecord {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");

  const rawLabel = o["label"];
  if (typeof rawLabel !== "string" || !(ROOT_CAUSES as readonly string[]).includes(rawLabel)) {
    fail(
      "ROOTCAUSE_UNKNOWN_LABEL",
      `${path}.label`,
      `expected one of ${ROOT_CAUSES.join(" | ")}; the enum is closed so that an unrecognised cause is refused rather than silently pooled`,
    );
  }
  const label = rawLabel as RootCause;

  const record: RootCauseRecord = {
    runId: str(o["runId"], `${path}.runId`),
    familyId: str(o["familyId"], `${path}.familyId`),
    label,
    rationale: typeof o["rationale"] === "string" ? o["rationale"] : "",
    evidenceRead: strArray(o["evidenceRead"] ?? [], `${path}.evidenceRead`),
    labelledBy: parseLabeller(o["labelledBy"], `${path}.labelledBy`),
    diagnosisReading:
      o["diagnosisReading"] === null || o["diagnosisReading"] === undefined
        ? null
        : oneOf(o["diagnosisReading"], `${path}.diagnosisReading`, [
            "capability",
            "likely-spec-defect",
            "single-cause-fanout",
            "mixed",
            "clean",
          ] as const),
  };

  if (record.rationale.trim().length < MIN_RATIONALE) {
    fail(
      "ROOTCAUSE_NO_RATIONALE",
      `${path}.rationale`,
      `a root cause must state why this label and not the neighbouring one (at least ${MIN_RATIONALE} characters)`,
    );
  }

  // `unlabelled` is the one label that names no evidence, because it is the claim that nobody has
  // looked. Every other label asserts that somebody did.
  if (record.label !== "unlabelled" && record.evidenceRead.length === 0) {
    fail(
      "ROOTCAUSE_NO_EVIDENCE",
      `${path}.evidenceRead`,
      "a root cause that names nothing the labeller read is an opinion; name the artifacts",
    );
  }

  assertRootCauseAgainstTrial(record, options.record, path);
  return record;
}

/**
 * The cross-checks that need the trial itself.
 *
 * Split out so a sidecar can be parsed on its own (a fixture, a hand-written record) and still be
 * checked against its trial the moment one is available.
 */
export function assertRootCauseAgainstTrial(
  record: RootCauseRecord,
  trial: TrialRecord | undefined,
  path = "root-cause",
): void {
  if (trial === undefined) return;

  if (record.runId !== trial.runId || record.familyId !== trial.familyId) {
    fail(
      "ROOTCAUSE_RUN_MISMATCH",
      `${path}.runId`,
      `record names ${record.familyId}/${record.runId} but sits beside ${trial.familyId}/${trial.runId}; a root cause copied across directories attributes one trial's cause to another`,
    );
  }

  const failedScenarios = trial.cells.filter(cellFailed).length;

  if (FAILURE_ATTRIBUTING.has(record.label) && failedScenarios === 0) {
    fail(
      "ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME",
      `${path}.label`,
      `"${record.label}" attributes a failure, and this trial failed no scenario; a clean run has no defect to attribute and is not difficulty evidence`,
    );
  }

  if (record.label === "clean" && failedScenarios > 0) {
    fail(
      "ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME",
      `${path}.label`,
      `"clean" on a trial that failed ${failedScenarios} scenario(s); the failures are real and something caused them`,
    );
  }

  if (
    record.label === "capability" &&
    record.labelledBy.kind === "automated" &&
    record.diagnosisReading !== null &&
    NEEDS_HUMAN_READ.has(record.diagnosisReading)
  ) {
    fail(
      "ROOTCAUSE_CAPABILITY_OVER_UNREAD_DIAGNOSIS",
      `${path}.label`,
      `automated "capability" over a \`${record.diagnosisReading}\` reading, which diagnosis.ts says must not be quoted as a difficulty result without a person reading the transcript. Both published mis-labellings in this repository have exactly this shape.`,
    );
  }
}

/** Is this trial's outcome difficulty evidence, given its root cause? */
export function isDifficultyEvidence(record: TrialRecord, cause: RootCauseRecord): boolean {
  return (
    record.subjectType === "agent" &&
    record.counts &&
    record.cells.some(cellFailed) &&
    DIFFICULTY_EVIDENCE_CAUSES.has(cause.label)
  );
}

export interface RootCauseTally {
  readonly counted: number;
  /** Counted trials that failed at least one scenario and are labelled `capability`. */
  readonly capability: number;
  /** Counted trials with no adjudication. The population the gate refuses to guess about. */
  readonly unlabelled: number;
  /** Every label seen over the counted population, in enum order. */
  readonly byLabel: Readonly<Record<RootCause, number>>;
}

/** Tally root causes over a population of trials that have already been filtered to the counted set. */
export function tallyRootCauses(
  trials: readonly { readonly record: TrialRecord; readonly rootCause: RootCauseRecord }[],
): RootCauseTally {
  const byLabel = Object.fromEntries(ROOT_CAUSES.map((c) => [c, 0])) as Record<RootCause, number>;
  let capability = 0;
  let unlabelled = 0;
  for (const t of trials) {
    byLabel[t.rootCause.label] += 1;
    if (t.rootCause.label === "unlabelled") unlabelled += 1;
    if (isDifficultyEvidence(t.record, t.rootCause)) capability += 1;
  }
  return { counted: trials.length, capability, unlabelled, byLabel };
}
