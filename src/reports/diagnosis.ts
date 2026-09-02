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
//
// WHAT THE FIRST VERSION OF THIS FILE COULD NOT SEE
//
// The spec-defect test above required `checks.length === 1`. No real failure in this repository has
// that shape. A single wrong root decision propagates: the deployment-alias family grades one
// decision and then grades six further checks that are GATED on that decision, so one root error
// publishes as six failing checks — and because each derivative check only reaches the scenarios its
// precondition selects, the failures also look "concentrated on a knob value". Both halves of the
// spec-defect test therefore failed, and every such trial was published as `capability`: a difficulty
// finding, and a count of six independent findings where there was one.
//
// The missing test is structural and needs no knowledge of which checks a family owns:
//
//   a single-cause fanout   N>=2 checks fail, and EVERY failing check's set of failing scenarios is
//                           identical to, or a subset of, ONE dominant check's set. Nothing failed
//                           outside the dominant check's scenarios, so there is exactly one root
//                           cause and the other checks are its derivatives.
//
// This is deliberately not a spec-defect verdict. It is a refusal to publish one root cause as N
// findings, and a routing decision: a human reads the transcript. Set containment cannot distinguish
// a derivative check from an independent check that happens to be precondition-gated on the same
// scenarios, and the note says so rather than pretending otherwise.

import type { TrialCell, TrialRecord } from "../trials/types.js";

export type FailureReading = "capability" | "likely-spec-defect" | "single-cause-fanout" | "mixed" | "clean";

/**
 * Readings that must not be quoted as a difficulty result without a person reading the transcript.
 * `capability` is the only reading that stands on its own, and `clean` is the only reading with
 * nothing to read.
 */
export const NEEDS_HUMAN_READ: ReadonlySet<FailureReading> = new Set<FailureReading>([
  "likely-spec-defect",
  "single-cause-fanout",
  "mixed",
]);

export const needsHumanRead = (d: TrialDiagnosis): boolean => NEEDS_HUMAN_READ.has(d.reading);

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
/**
 * Failure rate inside one knob-value group.
 *
 * A group with no scenarios has no rate. Dividing anyway yields NaN, and NaN is the worst possible
 * value here: `NaN > 0` is false so the row silently vanishes from `implicated`, `NaN - NaN` is NaN
 * so the sort comparator becomes non-total and the order goes implementation-defined, and the cell
 * renders as `NaN%` in a report someone is meant to read a root cause out of. Zero is wrong in an
 * obvious, visible way instead.
 *
 * Today `groups` only ever receives entries with `failed > 0`, and `scenarios` is incremented once
 * per cell, so `scenarios >= failed >= 1` and the guard never fires. It is here because the
 * invariant lives in a different loop from the division, and nothing enforces that it stays.
 */
const failureRate = (g: { readonly failed: number; readonly scenarios: number }): number =>
  g.scenarios === 0 ? 0 : g.failed / g.scenarios;

const WIPEOUT_SHARE = 0.9;

/**
 * Below this many failing scenarios, set containment is an artifact of the sample rather than a
 * signal: with two or three failures almost any pair of checks nests inside another by chance.
 */
const MIN_FANOUT_FAILED_SCENARIOS = 4;

export interface SingleCauseFanout {
  /** The check whose failing scenarios contain every other failing check's. */
  readonly dominant: string;
  /** The number of scenarios the dominant check failed. Equal to the trial's failing-scenario count. */
  readonly dominantScenarios: number;
  /** The other failing checks, each of whose failing scenarios is contained in the dominant's. */
  readonly derivative: readonly { readonly check: string; readonly scenarios: number }[];
}

/**
 * The structural test. Returns the fanout when every failing check's set of failing scenarios is
 * contained in one dominant check's set, and null otherwise.
 *
 * The false-positive this must not produce is a genuinely independent multi-check failure — two
 * checks that fail for different reasons on different scenarios. Containment excludes it directly:
 * if any check fails a scenario the dominant check passed, the union is larger than the dominant
 * set and there is more than one root cause, so no fanout is reported. That covers both the
 * disjoint case (`A={s0,s1}`, `B={s2,s3}`) and the overlapping-but-not-nested case
 * (`A={s0,s1,s2}`, `B={s2,s3}`).
 *
 * What containment CANNOT exclude is an independent check whose precondition happens to select a
 * subset of the dominant check's scenarios. That is why the reading routes to a human read rather
 * than asserting a cause.
 */
export function detectSingleCauseFanout(cells: readonly TrialCell[]): SingleCauseFanout | null {
  const failedCells = cells.filter((c) => c.failed.length > 0);
  if (failedCells.length < MIN_FANOUT_FAILED_SCENARIOS) return null;

  const sets = new Map<string, Set<string>>();
  for (const cell of failedCells) {
    for (const check of new Set(cell.failed)) {
      const scenarios = sets.get(check) ?? new Set<string>();
      scenarios.add(cell.scenarioId);
      sets.set(check, scenarios);
    }
  }
  if (sets.size < 2) return null;

  const ordered = [...sets.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
  const head = ordered[0];
  if (head === undefined) return null;
  const [dominant, dominantSet] = head;

  for (const [, scenarios] of ordered.slice(1)) {
    for (const scenarioId of scenarios) {
      if (!dominantSet.has(scenarioId)) return null;
    }
  }

  return {
    dominant,
    dominantScenarios: dominantSet.size,
    derivative: ordered.slice(1).map(([check, scenarios]) => ({ check, scenarios: scenarios.size })),
  };
}

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
    .filter((g) => failureRate(g) > 0)
    .sort((a, b) => failureRate(b) - failureRate(a) || a.knob.localeCompare(b.knob));

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

  // Checked AFTER the single-check wipeout (which requires exactly one check, so the two can never
  // both hold) and BEFORE `concentrated`, because a fanout's derivative checks are gated on scenario
  // preconditions and therefore always look concentrated. Order is the whole fix: the old code
  // reached `concentrated` first and published every fanout as `capability`.
  const fanout = detectSingleCauseFanout(record.cells);

  const reading: FailureReading =
    failedCells.length === 0
      ? "clean"
      : singleCheckWipeout
        ? "likely-spec-defect"
        : fanout !== null
          ? "single-cause-fanout"
          : concentrated
            ? "capability"
            : "mixed";

  // The multi-check generalisation of the single-check wipeout: one root check that fails nearly
  // every GRADED scenario, evenly across knob values, with everything else derivative of it. That,
  // and only that, is the fanout shape which points at the spec rather than the model.
  const fanoutWipeout =
    fanout !== null &&
    record.cells.length > 0 &&
    fanout.dominantScenarios / record.cells.length >= WIPEOUT_SHARE &&
    !concentrated;

  const matchesHypothesis =
    checks.some((c) => input.hypothesisChecks.includes(c.check)) &&
    (input.hypothesisKnob === null || implicated.some((g) => g.knob === input.hypothesisKnob));

  const notes: string[] = [];
  if (reading === "likely-spec-defect") {
    notes.push(
      `Every failure is on \`${topCheck?.check}\` and they are spread evenly across every knob value. That is the signature of a rule nobody could have satisfied rather than a capability the model lacks — the same signature the M3/M5 attribution ambiguity produced. Read the spec for this check before reading the model.`,
    );
  }
  if (reading === "single-cause-fanout" && fanout !== null) {
    notes.push(
      `${checks.length} checks failed, but every failing check's scenario set is contained in \`${fanout.dominant}\`'s (${fanout.dominantScenarios} of ${record.cells.length} graded scenarios). Nothing failed outside those scenarios, so this is ONE root cause with ${fanout.derivative.length} derivative check(s) — ${fanout.derivative.map((d) => `\`${d.check}\` (${d.scenarios})`).join(", ")} — not ${checks.length} independent findings. Do not quote the check count as breadth of difficulty.`,
    );
    notes.push(
      "Set containment cannot tell a derivative check apart from an independent check whose precondition happens to select the same scenarios. This trial needs a human to read the transcript for the root decision before it is quoted as difficulty or as a defect.",
    );
  }
  if (fanoutWipeout && fanout !== null) {
    notes.push(
      `\`${fanout.dominant}\` failed in nearly every graded scenario, evenly across knob values, and every other check is derivative of it. That is the single-check wipeout signature fanned out across checks: read the spec for \`${fanout.dominant}\` before reading the model.`,
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
    repairSuspected: reading === "likely-spec-defect" || fanoutWipeout,
  };
}

const READING_MEANING: Readonly<Record<FailureReading, string>> = {
  capability: "concentrated on some knob values — the shape of a real capability gap",
  "likely-spec-defect": "a uniform single-check wipeout — the shape of an unsatisfiable rule",
  "single-cause-fanout":
    "several checks, but every failing check's scenarios nest inside one dominant check's — one root cause published as N findings",
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
  const fanouts = failing.filter((d) => d.reading === "single-cause-fanout");

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
    "| `single-cause-fanout` | several checks, but every failing check's scenarios nest inside one dominant check's | one root cause, not N findings; a human reads the transcript before it is quoted |",
    "| `mixed` | several checks, no concentration | read the transcript; do not quote either way |",
    "",
    "Neither test is conclusive. The point is that a uniform single-check wipeout is never presented as",
    "difficulty without the alternative reading beside it — which is the mistake the M3/M5 ambiguity",
    "would have caused had nobody looked.",
    "",
    "`single-cause-fanout` is the reading the first version of this file could not produce. Its test",
    "required exactly one failing check, and no real failure here has that shape: one wrong root",
    "decision propagates into every check gated on it, and those derivative checks each reach only the",
    "scenarios their precondition selects, so the failure also looks concentrated. Both halves of the",
    "test failed and the trial published as `capability`. The structural test — every failing check's",
    "failing-scenario set contained in one dominant check's — catches it without naming any check, and",
    "does not fire when a check fails a scenario the dominant check passed, which is what a genuinely",
    "independent second failure mode looks like.",
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
                `| \`${g.knob}\` | \`${g.value}\` | ${g.scenarios} | ${g.failed} | ${(failureRate(g) * 100).toFixed(0)}% |`,
            ),
            "",
            ...d.notes.map((n) => `> ${n}`),
            "",
          ]),
        ].join("\n"),
    "",
    fanouts.length === 0
      ? "No trial shows a single-cause fanout."
      : [
          "## Human read required — single-cause fanout",
          "",
          `${fanouts.length} trial(s) failed several checks whose failing-scenario sets all nest inside one`,
          "dominant check's. Each is ONE root cause, and the check count is not a count of findings. None of",
          "them may be quoted as a difficulty result until someone has read the transcript for the root",
          "decision; and none of them is a spec-defect claim either, because set containment cannot separate",
          "a derivative check from an independent check gated on the same scenarios.",
          "",
          ...fanouts.map(
            (d) =>
              `- \`${d.runId}\`: dominant \`${d.checks[0]?.check ?? "unknown check"}\` (${d.checks[0]?.scenarios ?? 0} scenarios), ${Math.max(d.checks.length - 1, 0)} derivative check(s)`,
          ),
        ].join("\n"),
    "",
    suspect.length === 0
      ? "No trial shows the signature of a spec defect."
      : [
          "## Repair suspected",
          "",
          `${suspect.length} trial(s) show the uniform-wipeout signature — on one check, or on one dominant`,
          "check with every other failing check derivative of it. Before any of them is quoted",
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
