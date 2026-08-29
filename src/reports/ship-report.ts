// The ship / no-ship gate, written as a table rather than a judgement.
//
// This is the module most tempted toward vibes, so it is the one most deliberately mechanical. Each
// gate is a named predicate with a stated rationale drawn from something that actually went wrong in
// the source project, and the verdict is a pure function of which gates pass. There is no weighting,
// no score, and no override: a family either clears the blocking gates or it does not.
//
// The blocking/advisory split matters. A blocking gate is one whose absence means the family cannot
// produce trustworthy evidence at all -- no reference means no proof it is solvable, no mutants means
// no proof the verifier works, an unstated trust boundary means the grader may be reachable. An
// advisory gate is one where a reasonable author might disagree, so it is reported and does not
// block.
//
// Deliberately absent: any gate on "is this interesting". That is the author's call and no table
// should pretend otherwise.

import type { Registry } from "../foundry/registry.js";
import type { TaskShape } from "../foundry/schema.js";

export type GateVerdict = "pass" | "fail" | "n/a";

export interface Gate {
  readonly id: string;
  readonly question: string;
  /** Why this gate exists, in terms of something that went wrong without it. */
  readonly rationale: string;
  readonly blocking: boolean;
  readonly evaluate: (shape: TaskShape, registry: Registry) => { verdict: GateVerdict; detail: string };
}

const MIN_MUTANTS = 2;
const MIN_KNOBS = 3;
const MIN_MEASURED_AXES = 2;

export const GATES: readonly Gate[] = [
  {
    id: "solvable",
    question: "Is there a reference contract proving the family is solvable?",
    rationale:
      "A family whose reference does not pass is measuring its own bugs. No trial budget should be " +
      "spent before the reference is green.",
    blocking: true,
    evaluate: (s) => ({
      verdict: s.referenceContract.length > 0 ? "pass" : "fail",
      detail: `${s.referenceContract.length} contract item(s)`,
    }),
  },
  {
    id: "verifier-graded",
    question: `Does it name at least ${MIN_MUTANTS} known-bad implementations its verifier must catch?`,
    rationale:
      "Two of three Opus engines in the source trials wrote checkers that could not express the rule " +
      "they were checking, so their own fuzzers ran clean over the bug. Mutants are how a verifier " +
      "gets graded instead of trusted.",
    blocking: true,
    evaluate: (s) => ({
      verdict: s.expectedMutants.length >= MIN_MUTANTS ? "pass" : "fail",
      detail: `${s.expectedMutants.length} expected mutant(s)`,
    }),
  },
  {
    id: "trust-boundary",
    question: "Does every authoritative source state why the implementation cannot forge it?",
    rationale:
      "All three verifier bypasses found in the source project were the same shape: a ground truth " +
      "the engine turned out to be able to reach or rewrite.",
    blocking: true,
    evaluate: (s) => {
      const stated = s.authoritativeSources.filter((a) => a.whyEngineCannotForge.trim().length > 0);
      return {
        verdict:
          s.authoritativeSources.length > 0 && stated.length === s.authoritativeSources.length
            ? "pass"
            : "fail",
        detail: `${stated.length}/${s.authoritativeSources.length} source(s) state unforgeability`,
      };
    },
  },
  {
    id: "detectable",
    question: "Does every mechanism it targets have a mutant in the bank?",
    rationale:
      "A mechanism with no known-bad implementation is a difficulty the foundry can describe but not " +
      "detect, so a family built on it cannot demonstrate it measures anything.",
    blocking: true,
    evaluate: (s, r) => {
      const undetected = s.mechanisms.filter((m) => !r.mutants.some((x) => x.mechanisms.includes(m)));
      return {
        verdict: undetected.length === 0 ? "pass" : "fail",
        detail:
          undetected.length === 0 ? "all mechanisms detectable" : `no mutant for: ${undetected.join(", ")}`,
      };
    },
  },
  {
    id: "fairness",
    question: "Are fairness constraints stated?",
    rationale:
      "Four of nine gated mechanisms in the source project died as already-solved or unfair. Both are " +
      "cheaper to find on paper than after a build.",
    blocking: true,
    evaluate: (s) => ({
      verdict: s.fairnessConstraints.length > 0 ? "pass" : "fail",
      detail: `${s.fairnessConstraints.length} constraint(s)`,
    }),
  },
  {
    id: "cheat-resistance",
    question: "Are cheat-resistance requirements stated?",
    rationale:
      "An ungamed grader is an assumption until it is a requirement. Two of the three real bypasses " +
      "were found by writing the exploit, not by inspection.",
    blocking: true,
    evaluate: (s) => ({
      verdict: s.cheatResistance.length > 0 ? "pass" : "fail",
      detail: `${s.cheatResistance.length} requirement(s)`,
    }),
  },
  {
    id: "is-a-family",
    question: `Does it have at least ${MIN_KNOBS} knobs, so instances are cheaper than authoring?`,
    rationale:
      "A family with no parameter space is a single task wearing a family's name, and the entire " +
      "economic argument depends on instances being nearly free once the family exists.",
    blocking: true,
    evaluate: (s) => ({
      verdict: s.knobs.length >= MIN_KNOBS ? "pass" : "fail",
      detail: `${s.knobs.length} knob(s): ${s.knobs.map((k) => k.name).join(", ")}`,
    }),
  },
  {
    id: "hidden-region-declared",
    question: "Is the hidden graded region stated as a sampling of the declared space?",
    rationale:
      "Hidden tests that add rules are unfair; hidden tests that sample a declared space are not. The " +
      "difference has to be written down or nobody can tell which one was built.",
    blocking: true,
    evaluate: (s) => ({
      verdict: s.hiddenGradedRegion.trim().length > 0 ? "pass" : "fail",
      detail: s.hiddenGradedRegion.slice(0, 80),
    }),
  },
  {
    id: "measured-axes",
    question: `Has it measured at least ${MIN_MEASURED_AXES} independent axes?`,
    rationale:
      "The point of the whole exercise. A family yielding one axis is one measurement however many " +
      "instances it generates. Advisory rather than blocking, because an unbuilt family cannot have " +
      "measured anything yet — but it must not ship on an estimate.",
    blocking: false,
    evaluate: (s) => {
      if (s.dataQuality !== "measured" || s.estimatedAxes === null) {
        return { verdict: "n/a", detail: `estimated ${s.estimatedAxes ?? "—"} axes; not measured` };
      }
      return {
        verdict: s.estimatedAxes >= MIN_MEASURED_AXES ? "pass" : "fail",
        detail: `${s.estimatedAxes} measured axes`,
      };
    },
  },
  {
    id: "difficulty-evidenced",
    question: "Has any real agent or model been measured against this family?",
    rationale:
      "A measured axis count against a bank of hand-written mutants proves the VERIFIER discriminates. " +
      "It says nothing about whether the family is hard, because nothing that could plausibly fail it " +
      "has attempted it. This gate was added after the second family scored four measured axes with " +
      "zero agent trials and would otherwise have been marked SHIP.",
    blocking: false,
    evaluate: (s) => {
      if (s.agentTrialsRun === null) {
        return { verdict: "fail", detail: "no agent trials recorded" };
      }
      return {
        verdict: s.agentTrialsRun > 0 ? "pass" : "fail",
        detail: `${s.agentTrialsRun} agent trial(s)`,
      };
    },
  },
  {
    id: "priced",
    question: "Is the build cost recorded?",
    rationale: "An unpriced family cannot enter the budget model, so the plan built on it is fiction.",
    blocking: false,
    evaluate: (s) => ({
      verdict: s.estimatedBuildHours > 0 ? "pass" : "fail",
      detail: `${s.estimatedBuildHours}h build, $${s.estimatedFrontierUsd} frontier`,
    }),
  },
];

export type ShipVerdict = "SHIP" | "HOLD" | "NOT-READY";

export interface FamilyAssessment {
  readonly familyId: string;
  readonly verdict: ShipVerdict;
  readonly results: readonly { gate: Gate; verdict: GateVerdict; detail: string }[];
  readonly blockingFailures: readonly string[];
}

export function assessFamily(shape: TaskShape, registry: Registry): FamilyAssessment {
  const results = GATES.map((gate) => {
    const { verdict, detail } = gate.evaluate(shape, registry);
    return { gate, verdict, detail };
  });
  const blockingFailures = results
    .filter((r) => r.gate.blocking && r.verdict === "fail")
    .map((r) => r.gate.id);
  const measured = results.find((r) => r.gate.id === "measured-axes");
  const evidenced = results.find((r) => r.gate.id === "difficulty-evidenced");
  // SHIP needs both: the verifier discriminates (measured axes) AND something that could fail the
  // family has tried. Either alone is a different, weaker claim.
  const verdict: ShipVerdict =
    blockingFailures.length > 0
      ? "NOT-READY"
      : measured?.verdict === "pass" && evidenced?.verdict === "pass"
        ? "SHIP"
        : "HOLD";
  return { familyId: shape.familyId, verdict, results, blockingFailures };
}

const ICON: Readonly<Record<GateVerdict, string>> = { pass: "pass", fail: "**FAIL**", "n/a": "n/a" };

export function renderShipReport(shapes: readonly TaskShape[], registry: Registry): string {
  const assessments = shapes.map((s) => assessFamily(s, registry));
  const lines: string[] = [
    "# Ship / no-ship",
    "",
    "Each family against a fixed gate table. The verdict is a pure function of the gates — no",
    "weighting, no score, no override. **SHIP** means every blocking gate passes and the family has a",
    `measured axis count of at least ${String(MIN_MEASURED_AXES)}; **HOLD** means it is structurally sound but its diversity is still an`,
    "estimate; **NOT-READY** means at least one blocking gate fails.",
    "",
    "| family | verdict | blocking failures |",
    "|---|---|---|",
    ...assessments.map(
      (a) =>
        `| \`${a.familyId}\` | **${a.verdict}** | ${a.blockingFailures.length === 0 ? "none" : a.blockingFailures.join(", ")} |`,
    ),
    "",
    "## Gate table",
    "",
    "| gate | blocking | question |",
    "|---|---|---|",
    ...GATES.map((g) => `| \`${g.id}\` | ${g.blocking ? "yes" : "advisory"} | ${g.question} |`),
    "",
    "## Per family",
    "",
  ];

  for (const a of assessments) {
    lines.push(`### \`${a.familyId}\` — ${a.verdict}`, "", "| gate | result | detail |", "|---|---|---|");
    for (const r of a.results) {
      lines.push(`| \`${r.gate.id}\` | ${ICON[r.verdict]} | ${r.detail} |`);
    }
    lines.push("");
  }

  lines.push(
    "## Why these gates",
    "",
    ...GATES.map((g) => `- **\`${g.id}\`** — ${g.rationale}`),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  );
  return lines.join("\n");
}
