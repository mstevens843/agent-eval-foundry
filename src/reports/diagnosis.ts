// Diagnosing a counted failure, and telling a capability finding apart from a spec defect.
//
// WHY THIS EXISTS
//
// The last campaign's most valuable trial was one that failed 47 scenarios on a single check — and
// the model was right. The spec listed its rules in evaluation order, one rule explicitly covered the
// case, the model cited it, and the verifier demanded a different one. That failure looked exactly
// like a capability finding and was a defect in the family.
//
// The two are distinguishable, and this module states the tests:
//
//   a capability finding  fails a MINORITY of the scenarios that reach the check, and the failures
//                         concentrate on some values of a knob
//   a spec defect         fails NEARLY EVERY scenario that reaches the check, uniformly, on one
//                         check — the signature of a rule nobody could have satisfied
//
// Neither test is conclusive and the report says so. What it will not do is present a uniform
// single-check wipeout as difficulty without flagging the alternative reading.

import type { TrialRecord } from "../trials/types.js";

export type FailureReading = "capability" | "likely-spec-defect" | "mixed" | "clean";

export interface ScenarioGroup {
  readonly knob: string;
  readonly value: string;
  readonly scenarios: number;
  readonly failed: number;
}

export interface TrialDiagnosis {
  readonly runId: string;
  readonly familyId: string;
  readonly model: string | null;
  readonly counted: boolean;
  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  readonly checks: readonly { readonly check: string; readonly scenarios: number; readonly share: number }[];
  /** Knob values where the failures concentrated, strongest first. */
  readonly implicated: readonly ScenarioGroup[];
  readonly reading: FailureReading;
  readonly matchesHypothesis: boolean;
  readonly notes: readonly string[];
  /** True when the failure pattern suggests the spec, not the model, should change. */
  readonly repairSuspected: boolean;
}

export interface DiagnoseInput {
  readonly familyId: string;
  readonly record: TrialRecord;
  readonly params: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  /** Checks the family's pre-registered hypothesis said would fail. */
  readonly hypothesisChecks: readonly string[];
  /** Knob the pre-registered hypothesis said would move the failure rate. */
  readonly hypothesisKnob: string | null;
}

/** Share of failures above which a single-check wipeout is read as a spec problem. */
const WIPEOUT_SHARE = 0.9;

export function diagnose(input: DiagnoseInput): TrialDiagnosis {
  const { record } = input;
  const failedCells = record.cells.filter((c) => c.failed.length > 0);

  const byCheck = new Map<string, number>();
  for (const cell of failedCells) {
    for (const check of new Set(cell.failed)) byCheck.set(check, (byCheck.get(check) ?? 0) + 1);
  }
  const checks = [...byCheck.entries()]
    .map(([check, scenarios]) => ({
      check,
      scenarios,
      share: failedCells.length === 0 ? 0 : scenarios / failedCells.length,
    }))
    .sort((a, b) => b.scenarios - a.scenarios || a.check.localeCompare(b.check));

  // Which knob values the failures sat on, as a share of the scenarios that had that value.
  const knobs = new Set<string>();
  for (const p of input.params.values()) for (const k of Object.keys(p)) knobs.add(k);
  const groups: ScenarioGroup[] = [];
  for (const knob of [...knobs].sort()) {
    const tally = new Map<string, { scenarios: number; failed: number }>();
    for (const cell of record.cells) {
      const value = String(input.params.get(cell.scenarioId)?.[knob] ?? "—");
      const entry = tally.get(value) ?? { scenarios: 0, failed: 0 };
      entry.scenarios += 1;
      if (cell.failed.length > 0) entry.failed += 1;
      tally.set(value, entry);
    }
    for (const [value, e] of tally) {
      if (e.failed > 0) groups.push({ knob, value, scenarios: e.scenarios, failed: e.failed });
    }
  }
  const implicated = groups
    .filter((g) => g.failed / g.scenarios > 0)
    .sort((a, b) => b.failed / b.scenarios - a.failed / a.scenarios || a.knob.localeCompare(b.knob));

  // Is the failure confined to some values of some knob, or spread over all of them?
  const concentrated = [...knobs].some((knob) => {
    const values = groups.filter((g) => g.knob === knob);
    const all = new Set<string>();
    for (const cell of record.cells) all.add(String(input.params.get(cell.scenarioId)?.[knob] ?? "—"));
    return values.length > 0 && values.length < all.size;
  });

  const topCheck = checks[0];
  const singleCheckWipeout =
    checks.length === 1 && topCheck !== undefined && topCheck.share >= WIPEOUT_SHARE && !concentrated;

  const reading: FailureReading =
    failedCells.length === 0
      ? "clean"
      : singleCheckWipeout
        ? "likely-spec-defect"
        : concentrated
          ? "capability"
          : "mixed";

  const matchesHypothesis =
    checks.some((c) => input.hypothesisChecks.includes(c.check)) &&
    (input.hypothesisKnob === null || implicated.some((g) => g.knob === input.hypothesisKnob));

  const notes: string[] = [];
  if (reading === "likely-spec-defect") {
    notes.push(
      `Every failure is on \`${topCheck?.check}\` and they are spread evenly across every knob value. That is the signature of a rule nobody could have satisfied rather than a capability the model lacks — the same signature the M3/M5 attribution ambiguity produced. Read the spec for this check before reading the model.`,
    );
  }
  if (reading === "capability" && matchesHypothesis) {
    notes.push(
      "Failures are confined to specific knob values and land on checks the pre-registered hypothesis named. This is the pattern that supports a difficulty claim.",
    );
  }
  if (reading === "capability" && !matchesHypothesis) {
    notes.push(
      "Failures are concentrated, so this looks like a capability finding — but not the one that was predicted. A new failure mode is a finding worth writing down separately, not folded into the original hypothesis.",
    );
  }
  if (reading === "mixed") {
    notes.push(
      "Failures span several checks and are not confined to particular knob values. Neither reading is clean; the trial needs a human to look at the transcript before it is quoted either way.",
    );
  }
  if (!record.counts) {
    notes.push(`This trial does not count: ${record.countsReason}`);
  }

  return {
    runId: record.runId,
    familyId: input.familyId,
    model: record.model,
    counted: record.counts,
    scenariosGraded: record.cells.length,
    scenariosFailed: failedCells.length,
    checks,
    implicated: implicated.slice(0, 12),
    reading,
    matchesHypothesis,
    notes,
    repairSuspected: reading === "likely-spec-defect",
  };
}

const READING_MEANING: Readonly<Record<FailureReading, string>> = {
  capability: "concentrated on some knob values — the shape of a real capability gap",
  "likely-spec-defect": "a uniform single-check wipeout — the shape of an unsatisfiable rule",
  mixed: "neither concentrated nor uniform; unresolved without reading the transcript",
  clean: "no failures",
};

export function renderDiagnoses(
  familyId: string,
  diagnoses: readonly TrialDiagnosis[],
  hypothesis: string,
): string {
  const failing = diagnoses.filter((d) => d.scenariosFailed > 0);
  const suspect = failing.filter((d) => d.repairSuspected);

  return [
    `# Failure diagnosis — ${familyId}`,
    "",
    "One diagnosis per counted trial that failed something, and the question each asks first: is this",
    "a capability finding, or is the family wrong?",
    "",
    `**Pre-registered hypothesis.** ${hypothesis}`,
    "",
    "## How the two readings are told apart",
    "",
    "| reading | signature | what to do |",
    "|---|---|---|",
    "| `capability` | failures confined to some knob values | a difficulty finding; report it |",
    "| `likely-spec-defect` | one check, nearly every scenario, evenly spread | read the spec for that check before reading the model |",
    "| `mixed` | several checks, no concentration | read the transcript; do not quote either way |",
    "",
    "Neither test is conclusive. The point is that a uniform single-check wipeout is never presented as",
    "difficulty without the alternative reading beside it — which is the mistake the M3/M5 ambiguity",
    "would have caused had nobody looked.",
    "",
    failing.length === 0
      ? "## No counted trial failed anything\n\nNothing to diagnose."
      : [
          "## Diagnoses",
          "",
          ...failing.flatMap((d) => [
            `### \`${d.runId}\` — ${d.model ?? "unknown model"}`,
            "",
            `**Reading: ${d.reading}** (${READING_MEANING[d.reading]}). Matches the pre-registered hypothesis: ${d.matchesHypothesis ? "**yes**" : "no"}.`,
            "",
            `${d.scenariosFailed} of ${d.scenariosGraded} scenarios failed.`,
            "",
            "| check | scenarios | share of failures |",
            "|---|---:|---:|",
            ...d.checks.map((c) => `| \`${c.check}\` | ${c.scenarios} | ${(c.share * 100).toFixed(0)}% |`),
            "",
            "**Knob values implicated** — failure rate within each value:",
            "",
            "| knob | value | scenarios | failed | rate |",
            "|---|---|---:|---:|---:|",
            ...d.implicated.map(
              (g) =>
                `| \`${g.knob}\` | \`${g.value}\` | ${g.scenarios} | ${g.failed} | ${((g.failed / g.scenarios) * 100).toFixed(0)}% |`,
            ),
            "",
            ...d.notes.map((n) => `> ${n}`),
            "",
          ]),
        ].join("\n"),
    "",
    suspect.length === 0
      ? "No trial shows the signature of a spec defect."
      : [
          "## Repair suspected",
          "",
          `${suspect.length} trial(s) show the uniform-single-check signature. Before any of them is quoted`,
          "as difficulty, the spec for the implicated check should be read for ambiguity. If the spec is",
          "repaired, the challenge package changes, its hash changes, and **every trial run against the",
          "old text stops counting automatically** — including these.",
          "",
          ...suspect.map((d) => `- \`${d.runId}\`: ${d.checks[0]?.check ?? "unknown check"}`),
        ].join("\n"),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
