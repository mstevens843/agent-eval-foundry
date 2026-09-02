// Why a family died, derived rather than narrated.
//
// The repository could already say "prompt-injection-containment is NOT-READY, blocking failure
// `not-already-solved`". That is a verdict, not an analysis, and a verdict is where most benchmark
// programs stop: the family is quietly dropped, the reason survives in someone's memory for about a
// month, and the next family repeats the mistake. The source project's kill log is the counter-
// example — nine gated mechanisms, each with a recorded cause of death, and reading it is what
// produced the observation that four of nine died the same way. That observation is worth more than
// any of the nine families would have been.
//
// So this module turns a gate verdict into a typed finding with citations, and then into a
// disposition: what to DO about it. The three things it refuses to do:
//
//   1. Guess. Twelve of the fifteen reasons are derived from gate results and trial evidence. The
//      three that cannot be (`too_synthetic`, `too_expensive`, `runner_unavailable`) must be declared
//      by an author, and are labelled `declared` wherever they appear so nobody reads a judgement as
//      a measurement.
//   2. Accept a kill with no evidence. `assertKillAnalysis` rejects it. A family killed for a reason
//      nobody can cite is a family killed on taste, and taste does not accumulate.
//   3. Conflate "the family is bad" with "we have not measured it yet". `verifier_only` and
//      `no_difficulty_evidence` are absences of evidence and their disposition is `trial`, never
//      `abandon`.

import type { FamilyAssessment, FamilyEvidence, GateVerdict } from "../reports/ship-report.js";
import { type RuleCode, type TaskShape, fail, isRecord, oneOf, str, strArray } from "./schema.js";

/**
 * The taxonomy. Every entry names a distinct thing that can be wrong, and the distinctions are the
 * point: `verifier_only` and `already_solved` both produce "no useful difficulty signal" and want
 * opposite responses — one needs a trial, the other needs the family rebuilt harder.
 */
export const KILL_REASONS = [
  "already_solved",
  "verifier_only",
  "redundant_axis",
  "unfair_hidden_rule",
  "hidden_artifact_leak",
  "no_mechanism_fire",
  "no_reference_solution",
  "no_mutant_discrimination",
  "no_difficulty_evidence",
  "too_synthetic",
  "too_expensive",
  "runner_unavailable",
  "insufficient_shared_bank",
  "grader_gameable",
  "ambiguous_truth_source",
] as const;
export type KillReason = (typeof KILL_REASONS)[number];

/**
 * What to do next. Separated from the reason because several reasons share a response and one reason
 * can change response with context — an `already_solved` family with a novel mechanism is worth
 * hardening, the same family after two failed hardening rounds is worth abandoning.
 */
export const DISPOSITIONS = ["harden", "mutate", "split", "trial", "repair", "schedule", "abandon"] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export type FindingSource = "derived" | "declared";

export interface KillReasonSpec {
  readonly reason: KillReason;
  readonly summary: string;
  /** What must be true for this finding to be legitimate. Enforced by `assertKillAnalysis`. */
  readonly evidenceRequirement: string;
  readonly disposition: Disposition;
  /** Is this a defect in the family, or an absence of evidence about it? */
  readonly kind: "defect" | "weakness" | "absence" | "cost";
}

export const KILL_REASON_SPECS: readonly KillReasonSpec[] = [
  {
    reason: "already_solved",
    summary:
      "Every counted agent trial passed. The family cannot separate the subjects it was built to separate.",
    evidenceRequirement: "at least one counted agent trial, and every one of them passing",
    disposition: "harden",
    kind: "weakness",
  },
  {
    reason: "verifier_only",
    summary:
      "The verifier discriminates against hand-written mutants and nothing that could plausibly fail it has attempted it.",
    evidenceRequirement: "mutants caught by their intended checks, and zero counted agent trials",
    disposition: "trial",
    kind: "absence",
  },
  {
    reason: "redundant_axis",
    summary: "The instances collapse to too few independent axes: the suite measures one thing many times.",
    evidenceRequirement: "a measured axis count below the minimum",
    disposition: "mutate",
    kind: "weakness",
  },
  {
    reason: "unfair_hidden_rule",
    summary:
      "The hidden region adds a rule rather than sampling the declared space, so failure teaches nothing.",
    evidenceRequirement: "the hidden-region gate failing, or a fairness constraint absent",
    disposition: "repair",
    kind: "defect",
  },
  {
    reason: "hidden_artifact_leak",
    summary: "The agent-facing package contains an answer key.",
    evidenceRequirement: "a challenge-package check failing on a hidden artifact",
    disposition: "repair",
    kind: "defect",
  },
  {
    reason: "no_mechanism_fire",
    summary: "Scenarios do not exercise the mechanism they claim to; they pass or fail for another reason.",
    evidenceRequirement: "the mechanisms-exercised gate failing on measured evidence",
    disposition: "repair",
    kind: "defect",
  },
  {
    reason: "no_reference_solution",
    summary: "The reference does not pass. The family is measuring its own bugs.",
    evidenceRequirement: "a reference sweep with at least one failure",
    disposition: "repair",
    kind: "defect",
  },
  {
    reason: "no_mutant_discrimination",
    summary: "A declared mutant is not caught by the check it was written to trip: the check is decorative.",
    evidenceRequirement: "a mutant that passes its intended check",
    disposition: "repair",
    kind: "defect",
  },
  {
    reason: "no_difficulty_evidence",
    summary: "Nothing has attempted the family, so nothing is known about whether it is hard.",
    evidenceRequirement: "zero counted agent trials",
    disposition: "trial",
    kind: "absence",
  },
  {
    reason: "too_synthetic",
    summary:
      "The scenarios are too small or too clean to resemble the situation the mechanism appears in, so a pass may not transfer.",
    evidenceRequirement: "an author's declaration; this one is a judgement and is labelled as such",
    disposition: "mutate",
    kind: "weakness",
  },
  {
    reason: "too_expensive",
    summary: "The family costs more to build or to trial than its expected axis yield justifies.",
    evidenceRequirement: "declared build hours and frontier spend, against a stated budget",
    disposition: "split",
    kind: "cost",
  },
  {
    reason: "runner_unavailable",
    summary: "No provider or isolation level exists that can run this family honestly.",
    evidenceRequirement: "an author's declaration naming what is missing",
    disposition: "schedule",
    kind: "absence",
  },
  {
    reason: "insufficient_shared_bank",
    summary:
      "Too few subjects have attempted this family and another, so cross-family axes are unmeasurable.",
    evidenceRequirement: "a shared-subject count below the threshold",
    disposition: "schedule",
    kind: "absence",
  },
  {
    reason: "grader_gameable",
    summary: "The isolation is too weak for the subjects being graded, so a pass may be a bypass.",
    evidenceRequirement: "counted agent trials graded at an isolation level below subprocess",
    disposition: "repair",
    kind: "defect",
  },
  {
    reason: "ambiguous_truth_source",
    summary: "An authoritative source does not state why the implementation cannot forge it.",
    evidenceRequirement: "the trust-boundary gate failing",
    disposition: "repair",
    kind: "defect",
  },
];

const SPEC_BY_REASON: ReadonlyMap<KillReason, KillReasonSpec> = new Map(
  KILL_REASON_SPECS.map((s) => [s.reason, s]),
);

export const killReasonSpec = (reason: KillReason): KillReasonSpec => {
  const spec = SPEC_BY_REASON.get(reason);
  if (spec === undefined) fail("KILL_UNKNOWN_REASON", `kill.${reason}`, "not in the taxonomy");
  return spec;
};

export interface KillFinding {
  readonly reason: KillReason;
  readonly source: FindingSource;
  /** Gates whose verdict supports this finding. Empty is legal only for a declared finding. */
  readonly gates: readonly string[];
  /** Concrete citations: numbers, run ids, file paths. Never empty. */
  readonly evidence: readonly string[];
  readonly detail: string;
}

export interface KillAnalysis {
  readonly familyId: string;
  readonly verdict: FamilyAssessment["verdict"];
  readonly blockingFailures: readonly string[];
  readonly advisoryFailures: readonly string[];
  readonly findings: readonly KillFinding[];
  /** The finding that decides the disposition. Null only when nothing is wrong. */
  readonly primary: KillFinding | null;
  readonly disposition: Disposition | null;
  /** What to change, in the order it should be changed. */
  readonly nextActions: readonly string[];
  /** True when every finding is derived from measurement rather than declared. */
  readonly fullyDerived: boolean;
}

/** Author-supplied judgements. Kept separate from derived findings and labelled everywhere. */
export interface DeclaredConcerns {
  readonly tooSynthetic?: string;
  readonly tooExpensive?: string;
  readonly runnerUnavailable?: string;
}

const MIN_MEASURED_AXES = 2;

/**
 * Reasons are emitted in this order, and the FIRST one becomes primary.
 *
 * The ordering is a claim about which problem to fix first, and it is deliberately not severity in
 * the abstract. A family whose reference fails cannot be trusted to tell you anything else, so
 * defects come before weaknesses; `already_solved` outranks `verifier_only` because a family with
 * passing trials has evidence and a family without has none; the cost and infrastructure reasons
 * come last because they are true of a good family as readily as a bad one.
 */
const REASON_ORDER: readonly KillReason[] = [
  "no_reference_solution",
  "hidden_artifact_leak",
  "ambiguous_truth_source",
  "unfair_hidden_rule",
  "no_mechanism_fire",
  "no_mutant_discrimination",
  "grader_gameable",
  "already_solved",
  "redundant_axis",
  "too_synthetic",
  "verifier_only",
  "no_difficulty_evidence",
  "too_expensive",
  "insufficient_shared_bank",
  "runner_unavailable",
];

const gateVerdict = (a: FamilyAssessment, id: string): GateVerdict | undefined =>
  a.results.find((r) => r.gate.id === id)?.verdict;

const gateDetail = (a: FamilyAssessment, id: string): string =>
  a.results.find((r) => r.gate.id === id)?.detail ?? "";

/**
 * Derive every finding that the gate table and trial evidence support.
 *
 * Note what this does NOT do: it never invents a reason from the shape's prose, and it never reports
 * `already_solved` without counted trials. The distinction between "no agent failed it" and "no
 * agent tried it" is the entire reason this layer exists, and collapsing the two would reproduce the
 * error the difficulty gate was built to prevent.
 */
export function analyzeFamily(
  shape: TaskShape,
  assessment: FamilyAssessment,
  evidence?: FamilyEvidence,
  declared: DeclaredConcerns = {},
): KillAnalysis {
  const findings: KillFinding[] = [];
  const add = (
    reason: KillReason,
    source: FindingSource,
    gates: readonly string[],
    ev: readonly string[],
    detail: string,
  ): void => {
    findings.push({ reason, source, gates, evidence: ev, detail });
  };

  // --- defects in the family itself ------------------------------------------------------------
  if (gateVerdict(assessment, "reference-passes") === "fail") {
    add(
      "no_reference_solution",
      "derived",
      ["reference-passes"],
      [gateDetail(assessment, "reference-passes")],
      "The reference implementation does not pass every graded scenario, so every other number the family produces is measuring the family's own bugs.",
    );
  }
  if (gateVerdict(assessment, "trust-boundary") === "fail") {
    add(
      "ambiguous_truth_source",
      "derived",
      ["trust-boundary"],
      [gateDetail(assessment, "trust-boundary")],
      "An authoritative source does not state why the implementation cannot forge it, so a passing subject may simply be reporting a run it did not have.",
    );
  }
  if (
    gateVerdict(assessment, "hidden-region-declared") === "fail" ||
    gateVerdict(assessment, "fairness") === "fail"
  ) {
    add(
      "unfair_hidden_rule",
      "derived",
      ["hidden-region-declared", "fairness"],
      [gateDetail(assessment, "hidden-region-declared"), gateDetail(assessment, "fairness")].filter(
        (s) => s.length > 0,
      ),
      "The hidden region is not declared as a sampling of a published space, so a failure may be a failure to guess an unstated rule.",
    );
  }
  if (gateVerdict(assessment, "mechanisms-exercised") === "fail") {
    add(
      "no_mechanism_fire",
      "derived",
      ["mechanisms-exercised"],
      [gateDetail(assessment, "mechanisms-exercised")],
      "Scenarios are not blocking on the rule they were built to exercise, so the suite passes for the wrong reason.",
    );
  }
  if (gateVerdict(assessment, "mutants-caught-by-intended-check") === "fail") {
    add(
      "no_mutant_discrimination",
      "derived",
      ["mutants-caught-by-intended-check"],
      [gateDetail(assessment, "mutants-caught-by-intended-check")],
      "At least one declared mutant is not caught by the check it was written to trip: that check cannot be relied on to detect anything.",
    );
  }
  if (gateVerdict(assessment, "isolation-level") === "fail") {
    add(
      "grader_gameable",
      "derived",
      ["isolation-level"],
      [gateDetail(assessment, "isolation-level")],
      "Agent artifacts are being graded at an isolation level that lets a subject reach the grader, so a pass cannot be distinguished from a bypass.",
    );
  }

  // --- weaknesses: the family works and does not measure enough ---------------------------------
  if (evidence !== undefined && evidence.countedAgentTrials > 0) {
    const failedTrials = evidence.countedAgentTrials - evidence.agentTrialsPassed;
    if (failedTrials === 0) {
      add(
        "already_solved",
        "derived",
        ["not-already-solved"],
        [
          `${evidence.countedAgentTrials} counted agent trial(s), ${evidence.agentTrialsPassed} of them passing every graded scenario`,
          `isolation: ${evidence.isolation}`,
        ],
        "Every counted agent trial passed cleanly. Whatever the verifier can detect, no subject in this bank exhibits it.",
      );
    } else if ((evidence.capabilityEvidencedTrials ?? 0) === 0) {
      // Counted failures exist and not one of them has been attributed to capability. That is not
      // `already_solved` — something failed — and it is not difficulty evidence either. It is the
      // state both published mis-labellings were in, and before the root-cause layer it had no name
      // and produced no finding, which would leave the family blocked for a reason nobody wrote down.
      add(
        "no_difficulty_evidence",
        "derived",
        ["difficulty-evidenced"],
        [
          `${failedTrials} of ${evidence.countedAgentTrials} counted trial(s) failed something`,
          `${evidence.unlabelledCountedTrials ?? evidence.countedAgentTrials} counted trial(s) carry no root-cause adjudication`,
        ],
        "Subjects failed and nobody has said why. A counted failure is consistent with a capability finding, with a package the subject could not have derived the answer from, and with the harness breaking a promise the package made — and the difficulty claim has to choose between them. Read the transcripts and record a root cause per trial.",
      );
    }
  } else if (evidence !== undefined) {
    const caught = evidence.mutantsCaught.filter((m) => m.caught).length;
    add(
      caught > 0 ? "verifier_only" : "no_difficulty_evidence",
      "derived",
      ["difficulty-evidenced"],
      [
        `${caught} of ${evidence.mutantsCaught.length} mutants caught by their intended check`,
        "0 counted agent trials",
      ],
      caught > 0
        ? "The verifier discriminates against implementations written alongside it. That is a fact about the verifier, and it is not evidence that the family is hard."
        : "Nothing has attempted this family and its mutants are not yet demonstrated, so nothing is known about it either way.",
    );
  } else {
    // No evidence bundle at all. Either nothing has attempted the family, or something has and the
    // only record of it is a number in the shape.
    //
    // The second case used to produce NO finding, because `difficulty-evidenced` passed on the
    // declared count and there was nothing to explain. Now that the gate wants a root cause it can
    // fail here, and a blocking gate that fails with no finding attached trips
    // `KILL_WITHOUT_REASON` — correctly: a family may not be held for a reason nobody wrote down.
    const declared = shape.agentTrialsRun ?? 0;
    add(
      "no_difficulty_evidence",
      "derived",
      ["difficulty-evidenced"],
      [
        declared === 0
          ? "the shape declares no agent trials"
          : `the shape declares ${declared} agent trial(s) and no trial directory or root-cause record exists for any of them`,
      ],
      declared === 0
        ? "Unbuilt or untried: the axis count in the shape is a pre-registration."
        : "Trials were run somewhere else and only their count came back. A count cannot say whether those subjects failed on the mechanism, on an underdetermined package or on a harness defect, and those are the three readings the difficulty claim has to choose between. Import the runs as trial directories and adjudicate them.",
    );
  }

  if (shape.dataQuality === "measured" && (shape.estimatedAxes ?? 0) < MIN_MEASURED_AXES) {
    add(
      "redundant_axis",
      "derived",
      ["measured-axes"],
      [`${shape.estimatedAxes ?? 0} measured axes, below the minimum of ${MIN_MEASURED_AXES}`],
      "The instances collapse: the suite is one measurement wearing many names.",
    );
  }

  if (gateVerdict(assessment, "shared-bank-ready") === "fail") {
    add(
      "insufficient_shared_bank",
      "derived",
      ["shared-bank-ready"],
      [gateDetail(assessment, "shared-bank-ready")],
      "Too few subjects have attempted this family and another, so its axes cannot be compared with any other family's.",
    );
  }

  // --- declared judgements, kept visibly separate -------------------------------------------------
  if (declared.tooSynthetic !== undefined) {
    add("too_synthetic", "declared", [], [declared.tooSynthetic], declared.tooSynthetic);
  }
  if (declared.tooExpensive !== undefined) {
    add("too_expensive", "declared", [], [declared.tooExpensive], declared.tooExpensive);
  }
  if (declared.runnerUnavailable !== undefined) {
    add("runner_unavailable", "declared", [], [declared.runnerUnavailable], declared.runnerUnavailable);
  }

  const ordered = [...findings].sort(
    (a, b) => REASON_ORDER.indexOf(a.reason) - REASON_ORDER.indexOf(b.reason),
  );
  const primary = ordered[0] ?? null;

  return {
    familyId: shape.familyId,
    verdict: assessment.verdict,
    blockingFailures: assessment.blockingFailures,
    advisoryFailures: assessment.results
      .filter((r) => !r.gate.blocking && r.verdict === "fail")
      .map((r) => r.gate.id),
    findings: ordered,
    primary,
    disposition: primary === null ? null : killReasonSpec(primary.reason).disposition,
    nextActions: nextActions(ordered),
    fullyDerived: ordered.every((f) => f.source === "derived"),
  };
}

/**
 * What to do, in order.
 *
 * Defects first — there is no point hardening a family whose reference does not pass — then the
 * weakness that decides the disposition, then everything that is merely missing.
 */
function nextActions(findings: readonly KillFinding[]): readonly string[] {
  const actions: string[] = [];
  for (const f of findings) {
    const spec = killReasonSpec(f.reason);
    switch (spec.disposition) {
      case "repair":
        actions.push(`Repair \`${f.reason}\` before anything else: ${spec.summary}`);
        break;
      case "harden":
        actions.push(
          "Evolve the family with hardening operators — the mechanism is intact and the difficulty is not.",
        );
        break;
      case "mutate":
        actions.push("Evolve the family by changing mechanism or domain, not by adding scenarios.");
        break;
      case "split":
        actions.push(
          "Split the family into smaller families that can each be priced and trialed separately.",
        );
        break;
      case "trial":
        actions.push("Run counted agent trials. Nothing else moves until difficulty is measured.");
        break;
      case "schedule":
        actions.push(`Schedule infrastructure work: ${spec.summary}`);
        break;
      case "abandon":
        actions.push("Abandon: nothing here is salvageable.");
        break;
    }
  }
  return [...new Set(actions)];
}

// ---------------------------------------------------------------- validation

/**
 * The checker. Independent of `analyzeFamily`: it re-derives nothing and only asserts the properties
 * a kill analysis must have, so an analysis written by hand — or by a future model — is held to the
 * same standard as one this module produced.
 */
export function assertKillAnalysis(analysis: KillAnalysis): void {
  const path = `kill.${analysis.familyId}`;

  if (analysis.verdict !== "SHIP" && analysis.findings.length === 0) {
    fail(
      "KILL_WITHOUT_REASON",
      path,
      `verdict is ${analysis.verdict} with no finding attached; a family cannot be held or killed for a reason nobody wrote down`,
    );
  }

  for (const f of analysis.findings) {
    killReasonSpec(f.reason);
    if (f.evidence.length === 0) {
      fail(
        "KILL_WITHOUT_EVIDENCE",
        `${path}.${f.reason}`,
        `no evidence cited. This reason requires: ${killReasonSpec(f.reason).evidenceRequirement}`,
      );
    }
    if (f.source === "derived" && f.gates.length === 0) {
      fail(
        "KILL_REASON_UNSUPPORTED",
        `${path}.${f.reason}`,
        "claims to be derived but names no gate; a derived finding must point at the check that produced it",
      );
    }
  }

  if (analysis.findings.length > 0 && analysis.disposition === null) {
    fail(
      "KILL_DISPOSITION_MISSING",
      path,
      "findings exist but no disposition was decided; an analysis that does not say what to do next is a note, not a decision",
    );
  }

  if (analysis.primary !== null && analysis.disposition !== null) {
    const expected = killReasonSpec(analysis.primary.reason).disposition;
    if (analysis.disposition !== expected) {
      fail(
        "KILL_DISPOSITION_MISSING",
        path,
        `disposition \`${analysis.disposition}\` does not follow from primary reason \`${analysis.primary.reason}\`, which implies \`${expected}\``,
      );
    }
  }
}

// ---------------------------------------------------------------- parsing (for checked-in analyses)

const KILL_CODES: readonly RuleCode[] = [
  "KILL_WITHOUT_REASON",
  "KILL_WITHOUT_EVIDENCE",
  "KILL_REASON_UNSUPPORTED",
  "KILL_DISPOSITION_MISSING",
  "KILL_UNKNOWN_REASON",
];

/** Exposed so the rule-coverage test can assert this module's codes are all reachable. */
export const KILL_RULE_CODES = KILL_CODES;

export function parseKillFinding(v: unknown, path: string): KillFinding {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    reason: oneOf(o["reason"], `${path}.reason`, KILL_REASONS),
    source: oneOf(o["source"], `${path}.source`, ["derived", "declared"] as const),
    gates: strArray(o["gates"], `${path}.gates`),
    evidence: strArray(o["evidence"], `${path}.evidence`),
    detail: str(o["detail"], `${path}.detail`),
  };
}
