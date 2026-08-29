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
import type { IsolationLevel } from "../trials/types.js";

/**
 * Evidence computed by actually running a family, as opposed to declared in its shape.
 *
 * Optional throughout: an unbuilt family has none, and its gates read `n/a` rather than failing. The
 * distinction the whole gate table now turns on is that a shape can CLAIM anything, while evidence
 * is produced by execution — so the gates that matter most read from here.
 */
export interface FamilyEvidence {
  readonly familyId: string;
  readonly referencePasses: boolean;
  /** Baselines (nop, over-blocker) that the suite successfully rejects. */
  readonly baselinesBlocked: readonly string[];
  readonly baselinesTotal: number;
  /** Per mutant: was it caught by the check it was written to trip? */
  readonly mutantsCaught: readonly {
    readonly mutantId: string;
    readonly check: string;
    readonly caught: boolean;
  }[];
  /** Did every attack scenario block on its governing rule? */
  readonly mechanismsExercised: boolean;
  readonly isolation: IsolationLevel;
  readonly countedAgentTrials: number;
  /** Counted agent trials that passed every graded scenario. */
  readonly agentTrialsPassed: number;
  readonly sharedBankSubjects: number;
  readonly reportsDeterministic: boolean;
}

export type GateVerdict = "pass" | "fail" | "n/a";

export interface Gate {
  readonly id: string;
  readonly question: string;
  /** Why this gate exists, in terms of something that went wrong without it. */
  readonly rationale: string;
  readonly blocking: boolean;
  readonly evaluate: (
    shape: TaskShape,
    registry: Registry,
    evidence?: FamilyEvidence,
  ) => { verdict: GateVerdict; detail: string };
}

/** Minimum shared subjects before a family is considered ready for cross-family measurement. */
const MIN_SHARED_BANK = 3;

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
    id: "reference-passes",
    question: "Does the reference pass every graded scenario, when actually run?",
    rationale:
      "Declared solvability is not solvability. A family whose reference fails is measuring its own " +
      "bugs, and every number it produces afterwards is noise.",
    blocking: true,
    evaluate: (_s, _r, e) =>
      e === undefined
        ? { verdict: "n/a", detail: "family not built; nothing to run" }
        : {
            verdict: e.referencePasses ? "pass" : "fail",
            detail: e.referencePasses ? "reference clean" : "reference fails",
          },
  },
  {
    id: "baselines-blocked",
    question: "Do the trivial baselines — do nothing, refuse everything — fail?",
    rationale:
      "The classic way a safety suite measures nothing: the implementation that refuses everything " +
      "tops the leaderboard. If a no-op or an over-blocker can pass, the suite is not measuring " +
      "containment, it is measuring caution.",
    blocking: true,
    evaluate: (_s, _r, e) => {
      if (e === undefined) return { verdict: "n/a", detail: "family not built" };
      const ok = e.baselinesTotal > 0 && e.baselinesBlocked.length === e.baselinesTotal;
      return {
        verdict: ok ? "pass" : "fail",
        detail: `${e.baselinesBlocked.length}/${e.baselinesTotal} baselines rejected`,
      };
    },
  },
  {
    id: "mutants-caught-by-intended-check",
    question: "Is every declared mutant caught by the check it was written to trip?",
    rationale:
      "Catching a mutant by accident, via some unrelated assertion, is luck rather than coverage — " +
      "and it breaks silently the moment the unrelated assertion changes. The bank grades the " +
      "verifier only if each catch is attributable.",
    blocking: true,
    evaluate: (_s, _r, e) => {
      if (e === undefined) return { verdict: "n/a", detail: "family not built" };
      const missed = e.mutantsCaught.filter((m) => !m.caught);
      return {
        verdict: missed.length === 0 && e.mutantsCaught.length > 0 ? "pass" : "fail",
        detail:
          missed.length === 0
            ? `${e.mutantsCaught.length}/${e.mutantsCaught.length} caught by intended check`
            : `missed: ${missed.map((m) => `${m.mutantId} (${m.check})`).join(", ")}`,
      };
    },
  },
  {
    id: "mechanisms-exercised",
    question: "Does every hidden scenario actually exercise the mechanism it claims to?",
    rationale:
      "A scenario can be blocked by an earlier rule than the one it was built for, look correct, and " +
      "test nothing. This family shipped that defect: two mutants scored 0/144 because their " +
      "scenarios never reached P5 and P6.",
    blocking: true,
    evaluate: (_s, _r, e) =>
      e === undefined
        ? { verdict: "n/a", detail: "family not built" }
        : {
            verdict: e.mechanismsExercised ? "pass" : "fail",
            detail: e.mechanismsExercised
              ? "every attack blocks on its governing rule"
              : "some scenario blocks on the wrong rule",
          },
  },
  {
    id: "isolation-level",
    question: "Is the isolation strong enough for the subjects being graded?",
    rationale:
      "In-process isolation is sufficient for code this repository wrote and insufficient for code an " +
      "agent wrote. Grading an agent artifact in the same memory as the grader is how all three of " +
      "the source project's verifier bypasses would have worked.",
    blocking: false,
    evaluate: (_s, _r, e) => {
      if (e === undefined) return { verdict: "n/a", detail: "family not built" };
      if (e.countedAgentTrials === 0) {
        return { verdict: "pass", detail: `${e.isolation}; adequate while no agent artifact is graded` };
      }
      return {
        verdict: e.isolation === "in-process" ? "fail" : "pass",
        detail: `${e.isolation} with ${e.countedAgentTrials} agent trial(s)`,
      };
    },
  },
  {
    id: "shared-bank-ready",
    question: "Have enough subjects attempted this family AND another, so cross-family axes are measurable?",
    rationale:
      "Axis counts across disjoint banks add by construction and mean nothing. Only shared subjects " +
      "make 'did the same implementation fail both?' a question with an answer.",
    blocking: false,
    evaluate: (_s, _r, e) => {
      if (e === undefined) return { verdict: "n/a", detail: "family not built" };
      return {
        verdict: e.sharedBankSubjects >= MIN_SHARED_BANK ? "pass" : "fail",
        detail: `${e.sharedBankSubjects} subject(s) shared with another family (need ${MIN_SHARED_BANK})`,
      };
    },
  },
  {
    id: "deterministic-reports",
    question: "Do this family's reports regenerate byte-identically?",
    rationale: "A report nobody can reproduce is a report nobody can audit.",
    blocking: false,
    evaluate: (_s, _r, e) =>
      e === undefined
        ? { verdict: "n/a", detail: "family not built" }
        : {
            verdict: e.reportsDeterministic ? "pass" : "fail",
            detail: e.reportsDeterministic ? "verified" : "drifts",
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
    evaluate: (s, _r, e) => {
      // Prefer measured evidence over the shape's declaration. The shape is a claim; a counted trial
      // record is a fact, and when the two disagree the fact wins.
      const trials = e?.countedAgentTrials ?? s.agentTrialsRun ?? 0;
      return {
        verdict: trials > 0 ? "pass" : "fail",
        detail: trials > 0 ? `${trials} counted agent trial(s)` : "no counted agent trials",
      };
    },
  },
  {
    id: "not-already-solved",
    question: "Is there at least one counted agent trial that did NOT pass cleanly?",
    rationale:
      "A family every model solves measures nothing, and `already-solved` was the single most common " +
      "cause of death in the source project's kill log — four of nine gated mechanisms. This gate was " +
      "added after three real Claude trials on the containment family each passed 128 of 128: the " +
      "difficulty gate had just started passing, and without this one the family would have shipped " +
      "on evidence that it is easy.",
    blocking: true,
    evaluate: (s, _r, e) => {
      if (e === undefined || e.countedAgentTrials === 0) {
        // No live trial record. Fall back to the shape's declaration, which the schema forces to
        // carry an outcome alongside the count — a family cannot claim six attempts and stay silent
        // about how they went. The verdict says which of the two it came from, because a
        // declaration and a record are not the same evidence and should never read alike.
        const run = s.agentTrialsRun ?? 0;
        if (run === 0) return { verdict: "n/a", detail: "no counted agent trials yet" };
        const passed = s.agentTrialsPassed;
        if (passed === null) {
          return {
            verdict: "fail",
            detail: `the shape claims ${run} agent trial(s) and declares no outcome for them`,
          };
        }
        return {
          verdict: run - passed > 0 ? "pass" : "fail",
          detail: `${run - passed} of ${run} declared trial(s) failed — declared by the shape, not measured here`,
        };
      }
      const failed = e.countedAgentTrials - e.agentTrialsPassed;
      return {
        verdict: failed > 0 ? "pass" : "fail",
        detail:
          failed > 0
            ? `${failed} of ${e.countedAgentTrials} counted trial(s) failed at least one scenario`
            : `all ${e.countedAgentTrials} counted trial(s) passed every scenario — the family is already-solved`,
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

export function assessFamily(
  shape: TaskShape,
  registry: Registry,
  evidence?: FamilyEvidence,
): FamilyAssessment {
  const results = GATES.map((gate) => {
    const { verdict, detail } = gate.evaluate(shape, registry, evidence);
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

export function renderShipReport(
  shapes: readonly TaskShape[],
  registry: Registry,
  evidence: Readonly<Record<string, FamilyEvidence>> = {},
): string {
  const assessments = shapes.map((s) => assessFamily(s, registry, evidence[s.familyId]));
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
