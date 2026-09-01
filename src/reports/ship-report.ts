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
import { type TaskShape, fail } from "../foundry/schema.js";
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
  /** True when the family emits a leak-checked challenge package and the router can grade it. */
  readonly trialReady?: boolean;
  /** Trials excluded because they measured a different challenge. Preserved, never counted. */
  readonly staleTrials?: readonly string[];
  /**
   * Number of independent DIFFICULTY axes over counted agent trials, or null when nothing has failed.
   *
   * Distinct from the measured axis count everywhere else in the ship report, which is over the
   * MUTANT bank and is a statement about what the verifier detects. A family can score six
   * mutant-detection axes and one agent-difficulty axis, and the UI family does exactly that.
   */
  readonly agentAxes?: number | null;
  /** True when every counted subject's failure set nests inside the next — one axis, any bank size. */
  readonly agentFailuresChain?: boolean;
  readonly agentChainOrder?: readonly string[];
  /** Human clean-room layer: package can be handed to a person without hidden context. */
  readonly humanPackageReady?: boolean;
  readonly humanPackageReadyDetail?: string;
  /** Counted independent human clean-room solves against the current package hash. */
  readonly cleanHumanSolves?: number;
  readonly humanReviewRecords?: number;
  readonly unresolvedHumanAmbiguities?: number;
  readonly humanClaimLevel?: "reference-solvable" | "human-ready" | "human-evidenced";
  /** Verifier-integrity layer: has the grader been attacked under a declared threat model? */
  readonly adversarialThreatModelDeclared?: boolean;
  readonly adversarialPackageReady?: boolean;
  readonly adversarialPackageReadyDetail?: string;
  readonly countedNoBypassAudits?: number;
  readonly countedBypassAudits?: number;
  readonly unrepairedBypasses?: number;
  readonly repairedBypasses?: number;
  readonly adversarialAuditRecords?: number;
  readonly adversarialIsolationAdequate?: boolean;
  readonly adversarialExploitReplayReady?: boolean;
  readonly adversarialHardeningProbesPass?: boolean;
  readonly adversarialHardeningProbeFailures?: number;
  readonly countedNoBypassV2Audits?: number;
  readonly countedBypassV2Audits?: number;
  readonly adversarialContainerIsolationReady?: boolean;
  readonly adversarialContainerNoNetworkAudits?: number;
  readonly adversarialContainerReadinessFailures?: readonly string[];
  readonly adversarialImportReplayValid?: boolean;
  readonly importedAdversarialAudits?: number;
  readonly browserBackedReady?: boolean;
  readonly browserBackedMeasured?: boolean;
  readonly browserBackedDetail?: string;
  readonly productionMatrixReady?: boolean;
  readonly productionMatrixDetail?: string;
  readonly productionReadinessStatuses?: readonly string[];
  readonly productionCrossLabSmokeEvidenced?: boolean;
  readonly productionMixedCrossLabSmoke?: boolean;
  readonly providerDeltaDiagnosisPresent?: boolean;
  readonly evolutionOptionsPresent?: boolean;
  readonly adversarialClaimLevel?:
    | "adversarial-ready"
    | "adversarial-audited"
    | "bypass-found"
    | "bypass-repaired"
    | "audit-pending";
}

export interface HumanGateEvidence {
  readonly familyId: string;
  readonly humanPackageReady: boolean;
  readonly humanPackageReadyDetail: string;
  readonly cleanHumanSolves: number;
  readonly humanReviewRecords: number;
  readonly unresolvedHumanAmbiguities: number;
  readonly humanClaimLevel: "reference-solvable" | "human-ready" | "human-evidenced";
}

export interface VerifierIntegrityEvidence {
  readonly familyId: string;
  readonly adversarialThreatModelDeclared: boolean;
  readonly adversarialPackageReady: boolean;
  readonly adversarialPackageReadyDetail: string;
  readonly countedNoBypassAudits: number;
  readonly countedBypassAudits: number;
  readonly unrepairedBypasses: number;
  readonly repairedBypasses: number;
  readonly adversarialAuditRecords: number;
  readonly adversarialIsolationAdequate: boolean;
  readonly adversarialExploitReplayReady: boolean;
  readonly adversarialHardeningProbesPass: boolean;
  readonly adversarialHardeningProbeFailures: number;
  readonly countedNoBypassV2Audits: number;
  readonly countedBypassV2Audits: number;
  readonly adversarialContainerIsolationReady: boolean;
  readonly adversarialContainerNoNetworkAudits: number;
  readonly adversarialContainerReadinessFailures: readonly string[];
  readonly adversarialImportReplayValid: boolean;
  readonly importedAdversarialAudits: number;
  readonly adversarialClaimLevel:
    | "adversarial-ready"
    | "adversarial-audited"
    | "bypass-found"
    | "bypass-repaired"
    | "audit-pending";
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
    humanEvidence?: HumanGateEvidence,
    verifierIntegrity?: VerifierIntegrityEvidence,
  ) => { verdict: GateVerdict; detail: string };
}

/** Minimum shared subjects before a family is considered ready for cross-family measurement. */
const MIN_SHARED_BANK = 3;

const MIN_MUTANTS = 2;
const MIN_KNOBS = 3;
const MIN_MEASURED_AXES = 2;

const humanFor = (e: FamilyEvidence | undefined, h: HumanGateEvidence | undefined) => h ?? e;
const adversarialFor = (e: FamilyEvidence | undefined, a: VerifierIntegrityEvidence | undefined) => a ?? e;

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
    id: "trial-ready",
    question: "Can a real agent actually be run against this family today?",
    rationale:
      "The gap between 'measured' and 'trialable' is where families sit for months. A family is " +
      "trial-ready when it emits a challenge package that passes its own leak check and the router " +
      "knows how to grade a submission for it — at which point the only thing between it and " +
      "difficulty evidence is model time.",
    blocking: false,
    evaluate: (s, _r, e) => {
      if (e === undefined) return { verdict: "n/a", detail: "family not built" };
      return e.trialReady === true
        ? { verdict: "pass", detail: "challenge package builds, leak check passes, router can grade it" }
        : { verdict: "fail", detail: "no route: this family cannot be handed to an agent as it stands" };
    },
  },
  {
    id: "difficulty-evidenced",
    question: "Has any real agent or model been measured against this family?",
    rationale:
      "A measured axis count against a bank of hand-written mutants proves the VERIFIER discriminates. " +
      "It says nothing about whether the family is hard, because nothing that could plausibly fail it " +
      "has attempted it. This gate was added after the second family scored four measured axes with " +
      "zero agent trials and would otherwise have been marked SHIP. It is BLOCKING as of the campaign " +
      "layer: with a trial router and a runnable challenge package for every built family, 'nobody has " +
      "tried it' stopped being a fact about the tooling and became a decision not to look.",
    blocking: true,
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
    id: "agent-axes-independent",
    question: "Do the counted agents fail in more than one direction, or do their failure sets nest?",
    rationale:
      "The measured-axes gate counts axes over the MUTANT bank: a statement about what the verifier " +
      "detects, bounded by how many known-bad implementations the author wrote. This one counts axes " +
      "over real agents, and the two can disagree sharply. If every subject's failure set nests inside " +
      "the next, the family separates subjects perfectly and measures ONE thing at several " +
      "sensitivities — and no additional subject can change that, because a chain stays a chain. " +
      "Advisory rather than blocking: a one-axis family is a legitimate benchmark component, and the " +
      "cost of pretending otherwise would be killing useful families. What it must not do is read as " +
      "breadth. The UI family scores six mutant axes, one agent axis, and five counted trials across " +
      "four subjects and two labs whose failure counts are 33, 46, 62, 62 and 90 — five different " +
      "numbers that are one measurement.",
    blocking: false,
    evaluate: (_s, _r, e) => {
      if (e === undefined) return { verdict: "n/a", detail: "family not built" };
      if (e.agentAxes === undefined || e.agentAxes === null) {
        return {
          verdict: "n/a",
          detail: "fewer than two counted failing subjects; no real-agent axis breadth claim yet",
        };
      }
      if (e.agentFailuresChain === true) {
        return {
          verdict: "fail",
          detail: `every counted subject's failures nest (${(e.agentChainOrder ?? []).join(" ⊂ ")}); one difficulty axis however many subjects attempt it. Only new scenarios with a genuine trade-off can raise it — see reports/scenario-diversity-report.md`,
        };
      }
      return {
        verdict: "pass",
        detail: `counted subjects fail in more than one direction (>= ${e.agentAxes} difficulty axes)`,
      };
    },
  },
  {
    id: "production-matrix-ready",
    question: "Has this family earned production-mode /6 matrix spend?",
    rationale:
      "A one-agent smoke trial is routing evidence. It can prove a family is worth follow-up, but " +
      "it must not silently unlock a full matrix before cross-lab smoke, current hashes and integrity " +
      "gates are satisfied.",
    blocking: false,
    evaluate: (_s, _r, e) => {
      if (e?.productionMatrixReady === undefined) {
        return { verdict: "n/a", detail: "no production-readiness layer for this family" };
      }
      return {
        verdict: e.productionMatrixReady ? "pass" : "fail",
        detail:
          e.productionMatrixDetail ??
          (e.productionMatrixReady ? "production matrix ready" : "production matrix blocked"),
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
  {
    id: "human-package-ready",
    question: "Can the public package be handed to an independent human without hidden context?",
    rationale:
      "Reference solvability only proves the author can solve the internal task. The public package " +
      "must also state the rules, examples, scoring contract and hidden sampling boundary clearly " +
      "enough for a clean-room engineer.",
    blocking: false,
    evaluate: (_s, _r, e, h) => {
      const human = humanFor(e, h);
      if (human?.humanPackageReady === undefined)
        return { verdict: "n/a", detail: "no human-readiness audit" };
      return {
        verdict: human.humanPackageReady ? "pass" : "fail",
        detail:
          human.humanPackageReadyDetail ?? (human.humanPackageReady ? "human-ready" : "not human-ready"),
      };
    },
  },
  {
    id: "human-solvability-evidenced",
    question: "Has an independent human solved the current public package clean-room?",
    rationale:
      "A task can be mechanically solvable and still be ambiguous to anyone who did not write it. " +
      "This gate counts only independent, current-hash, unassisted solves with notes and verifier output.",
    blocking: false,
    evaluate: (_s, _r, e, h) => {
      const human = humanFor(e, h);
      if (human?.cleanHumanSolves === undefined) return { verdict: "n/a", detail: "no human evidence layer" };
      return {
        verdict: human.cleanHumanSolves > 0 ? "pass" : "fail",
        detail:
          human.cleanHumanSolves > 0
            ? `${human.cleanHumanSolves} clean independent human solve(s)`
            : "no clean independent human solve on record",
      };
    },
  },
  {
    id: "human-ambiguity-reviewed",
    question: "Are human ambiguity findings resolved or explicitly absent?",
    rationale:
      "The fastest way to make a fair-looking benchmark unfair is to leave a human's clarifying " +
      "question unresolved and keep counting failures. Open ambiguity findings are reported separately.",
    blocking: false,
    evaluate: (_s, _r, e, h) => {
      const human = humanFor(e, h);
      if (human?.unresolvedHumanAmbiguities === undefined) {
        return { verdict: "n/a", detail: "no human review records" };
      }
      return {
        verdict: human.unresolvedHumanAmbiguities === 0 ? "pass" : "fail",
        detail:
          human.unresolvedHumanAmbiguities === 0
            ? `${human.humanReviewRecords ?? 0} human review record(s), no open ambiguity`
            : `${human.unresolvedHumanAmbiguities} unresolved ambiguity finding(s)`,
      };
    },
  },
  {
    id: "adversarial-threat-model-declared",
    question: "Is there a declared verifier-bypass threat model for this family?",
    rationale:
      "Cheat resistance is a design requirement, not evidence that anyone tried to break the grader. " +
      "The adversarial layer starts by declaring the attacker objective, surface and access boundary.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.adversarialThreatModelDeclared === undefined) {
        return { verdict: "n/a", detail: "no adversarial audit layer" };
      }
      return {
        verdict: adv.adversarialThreatModelDeclared ? "pass" : "fail",
        detail: adv.adversarialThreatModelDeclared ? "threat model declared" : "no threat model declared",
      };
    },
  },
  {
    id: "adversarial-package-ready",
    question: "Is a hash-pinned attack packet ready for this family?",
    rationale:
      "An adversarial audit without a preserved package is just a story about a task. The attacker " +
      "packet must pin the public challenge hash and state which artifacts are forbidden.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.adversarialPackageReady === undefined) {
        return { verdict: "n/a", detail: "no adversarial package audit" };
      }
      return {
        verdict: adv.adversarialPackageReady ? "pass" : "fail",
        detail:
          adv.adversarialPackageReadyDetail ??
          (adv.adversarialPackageReady ? "adversarial package ready" : "adversarial package missing"),
      };
    },
  },
  {
    id: "adversarial-audit-evidenced",
    question: "Has a counted attacker failed to find a verifier bypass against the current package?",
    rationale:
      "No adversarial run yet is not the same as no bypass. This gate counts only current-hash, " +
      "non-refusal, non-infrastructure, transcript-preserved no-bypass audits.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.countedNoBypassAudits === undefined) {
        return { verdict: "n/a", detail: "no adversarial audit evidence" };
      }
      return {
        verdict: adv.countedNoBypassAudits > 0 ? "pass" : "fail",
        detail:
          adv.countedNoBypassAudits > 0
            ? `${adv.countedNoBypassAudits} counted no-bypass audit(s)`
            : "no counted no-bypass audit on record",
      };
    },
  },
  {
    id: "no-known-unrepaired-bypass",
    question: "Are there zero counted, known, unrepaired verifier bypasses?",
    rationale:
      "A counted bypass does not necessarily kill the benchmark family, but it blocks any " +
      "verifier-integrity claim until the repair is recorded and old evidence is invalidated.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.unrepairedBypasses === undefined) {
        return { verdict: "n/a", detail: "no adversarial audit evidence" };
      }
      return {
        verdict: adv.unrepairedBypasses === 0 ? "pass" : "fail",
        detail:
          adv.unrepairedBypasses === 0
            ? `${adv.countedBypassAudits ?? 0} counted bypass(es), none unrepaired`
            : `${adv.unrepairedBypasses} counted unrepaired bypass(es)`,
      };
    },
  },
  {
    id: "adversarial-isolation-adequate",
    question: "Is adversarial execution isolated beyond the legacy subprocess profile?",
    rationale:
      "A no-bypass audit only means something if the attacker did not receive the repository, hidden " +
      "verifier, generated reports or mutable grader state. Subprocess preservation is not the same " +
      "as an attacker context boundary.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.adversarialIsolationAdequate === undefined) {
        return { verdict: "n/a", detail: "no adversarial isolation profile" };
      }
      return {
        verdict: adv.adversarialIsolationAdequate ? "pass" : "fail",
        detail: adv.adversarialIsolationAdequate
          ? "fs-sandbox/container isolation profile available"
          : "legacy subprocess profile only",
      };
    },
  },
  {
    id: "adversarial-exploit-replay-ready",
    question: "Can a claimed bypass artifact be replayed mechanically?",
    rationale:
      "A bypass report without replay is a claim about an exploit. Replay turns it into evidence by " +
      "rerunning the submitted artifact against the current verifier and package hash.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.adversarialExploitReplayReady === undefined) {
        return { verdict: "n/a", detail: "no exploit replay path" };
      }
      return {
        verdict: adv.adversarialExploitReplayReady ? "pass" : "fail",
        detail: adv.adversarialExploitReplayReady
          ? "exploit replay command and schema are available"
          : "claimed bypasses cannot be replayed mechanically",
      };
    },
  },
  {
    id: "adversarial-hardening-probes-pass",
    question: "Do deterministic verifier-integrity probes pass?",
    rationale:
      "Model adversarial audits are scarce and can refuse. Local probes keep known bypass classes " +
      "from regressing, but passing them is hardening evidence rather than no-bypass audit evidence.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.adversarialHardeningProbesPass === undefined) {
        return { verdict: "n/a", detail: "no deterministic hardening probes" };
      }
      return {
        verdict: adv.adversarialHardeningProbesPass ? "pass" : "fail",
        detail: adv.adversarialHardeningProbesPass
          ? "deterministic hardening probes pass"
          : `${adv.adversarialHardeningProbeFailures ?? 0} hardening probe failure(s)`,
      };
    },
  },
  {
    id: "adversarial-container-isolation-ready",
    question: "Is a real container/no-network adversarial isolation profile ready?",
    rationale:
      "The fs-sandbox boundary removes hidden files from the working directory, but it does not " +
      "disable networking or enforce process isolation. Container/no-network evidence is a stronger " +
      "claim and needs its own smoke record.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.adversarialContainerIsolationReady === undefined) {
        return { verdict: "n/a", detail: "no container isolation layer" };
      }
      return {
        verdict: adv.adversarialContainerIsolationReady ? "pass" : "fail",
        detail: adv.adversarialContainerIsolationReady
          ? "container/no-network isolation readiness passed"
          : `container/no-network isolation not ready${
              (adv.adversarialContainerReadinessFailures ?? []).length === 0
                ? ""
                : `: ${(adv.adversarialContainerReadinessFailures ?? []).join("; ")}`
            }`,
      };
    },
  },
  {
    id: "adversarial-container-no-network",
    question: "Is there counted adversarial evidence collected under container/no-network isolation?",
    rationale:
      "A no-network container audit is stronger than an fs-sandbox audit. Passing this gate requires " +
      "the counted audit itself to carry the container profile, not merely a prepared bundle.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.adversarialContainerNoNetworkAudits === undefined) {
        return { verdict: "n/a", detail: "no container/no-network audit field" };
      }
      return {
        verdict: adv.adversarialContainerNoNetworkAudits > 0 ? "pass" : "fail",
        detail:
          adv.adversarialContainerNoNetworkAudits > 0
            ? `${adv.adversarialContainerNoNetworkAudits} counted container/no-network audit(s)`
            : "no counted container/no-network audit on record",
      };
    },
  },
  {
    id: "adversarial-import-replay-valid",
    question: "Have imported non-local adversarial audits been replay-validated?",
    rationale:
      "External adversarial evidence is useful only when the transcript, provider identity, package " +
      "hash, verifier hash and replay output survive import. Otherwise it is not cross-lab evidence.",
    blocking: false,
    evaluate: (_s, _r, e, _h, a) => {
      const adv = adversarialFor(e, a);
      if (adv?.importedAdversarialAudits === undefined || adv.importedAdversarialAudits === 0) {
        return { verdict: "n/a", detail: "no counted imported adversarial audit" };
      }
      return {
        verdict: adv.adversarialImportReplayValid ? "pass" : "fail",
        detail: adv.adversarialImportReplayValid
          ? `${adv.importedAdversarialAudits} imported audit(s) replay-validated`
          : "imported adversarial audit failed replay/countability validation",
      };
    },
  },
  {
    id: "browser-backed-ready",
    question: "Is the browser-backed UI descendant ready for real browser trials?",
    rationale:
      "Live-DOM is dom-like. A browser-backed claim requires a real browser harness contract, trace " +
      "format, effect-ledger boundary and readiness gate before trials can count.",
    blocking: false,
    evaluate: (_s, _r, e) => {
      if (e?.browserBackedReady === undefined) return { verdict: "n/a", detail: "no browser-backed layer" };
      return {
        verdict: e.browserBackedReady ? "pass" : "fail",
        detail: e.browserBackedDetail ?? (e.browserBackedReady ? "browser-backed ready" : "not ready"),
      };
    },
  },
  {
    id: "browser-backed-measured",
    question: "Has a real browser-backed UI run been measured?",
    rationale:
      "A scaffold is not a browser result. This gate only passes after a real browser driver runs a " +
      "scenario sweep with preserved trace and verifier output.",
    blocking: false,
    evaluate: (_s, _r, e) => {
      if (e?.browserBackedMeasured === undefined)
        return { verdict: "n/a", detail: "no browser-backed layer" };
      return {
        verdict: e.browserBackedMeasured ? "pass" : "fail",
        detail: e.browserBackedMeasured ? "browser-backed run measured" : "no browser-backed run measured",
      };
    },
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
  humanEvidence?: HumanGateEvidence,
  verifierIntegrity?: VerifierIntegrityEvidence,
): FamilyAssessment {
  const results = GATES.map((gate) => {
    const { verdict, detail } = gate.evaluate(shape, registry, evidence, humanEvidence, verifierIntegrity);
    return { gate, verdict, detail };
  });
  const blockingFailures = results
    .filter((r) => r.gate.blocking && r.verdict === "fail")
    .map((r) => r.gate.id);
  const measured = results.find((r) => r.gate.id === "measured-axes");
  const evidenced = results.find((r) => r.gate.id === "difficulty-evidenced");
  const providerDeltaHold =
    evidence?.productionMixedCrossLabSmoke === true && evidence?.providerDeltaDiagnosisPresent === true;
  // SHIP needs both: the verifier discriminates (measured axes) AND something that could fail the
  // family has tried. Either alone is a different, weaker claim.
  const verdict: ShipVerdict =
    blockingFailures.length > 0
      ? "NOT-READY"
      : providerDeltaHold
        ? "HOLD"
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
  humanEvidence: Readonly<Record<string, HumanGateEvidence>> = {},
  verifierIntegrity: Readonly<Record<string, VerifierIntegrityEvidence>> = {},
): string {
  const assessments = shapes.map((s) =>
    assessFamily(s, registry, evidence[s.familyId], humanEvidence[s.familyId], verifierIntegrity[s.familyId]),
  );
  const lines: string[] = [
    "# Ship / no-ship",
    "",
    "Each family against a fixed gate table. The verdict is a pure function of the gates — no",
    "weighting, no score, no override. **SHIP** means every blocking gate passes and the family has a",
    `measured axis count of at least ${String(MIN_MEASURED_AXES)}; **HOLD** means it is structurally sound but its diversity is still an`,
    "estimate or current provider-delta routing blocks production claims; **NOT-READY** means at least one blocking gate fails.",
    "",
    "The human layer is reported as advisory claim levels. `reference-solvable`, `human-ready` and",
    "`human-evidenced` are separate claims and do not silently rewrite the model/verifier verdict.",
    "The verifier-integrity layer is also advisory here: `audit-pending`, `adversarial-ready`,",
    "`adversarial-audited`, `bypass-found` and `bypass-repaired` are separate claims from difficulty.",
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
    "## Human claim levels",
    "",
    "| family | reference-solvable | human-ready | human-evidenced | claim level |",
    "|---|---|---|---|---|",
    ...shapes.map((s) => {
      const e = evidence[s.familyId];
      const h = humanEvidence[s.familyId] ?? e;
      const ready = h?.humanPackageReady;
      const solves = h?.cleanHumanSolves;
      return `| \`${s.familyId}\` | ${s.referenceContract.length > 0 ? "yes" : "no"} | ${ready === undefined ? "n/a" : ready ? "yes" : "no"} | ${solves === undefined ? "n/a" : solves > 0 ? `yes (${solves})` : "pending"} | ${h?.humanClaimLevel ?? "reference-solvable"} |`;
    }),
    "",
    "## Verifier-integrity claim levels",
    "",
    "| family | threat model | attack package | fs/container isolation | replay | probes | no-bypass audits | container audits | imports | unrepaired bypasses | claim level |",
    "|---|---|---|---|---|---|---|---:|---:|---:|---|",
    ...shapes.map((s) => {
      const e = evidence[s.familyId];
      const a = verifierIntegrity[s.familyId] ?? e;
      const threat = a?.adversarialThreatModelDeclared;
      const ready = a?.adversarialPackageReady;
      const isolation = a?.adversarialIsolationAdequate;
      const replay = a?.adversarialExploitReplayReady;
      const probes = a?.adversarialHardeningProbesPass;
      const noBypass = a?.countedNoBypassAudits;
      const containerAudits = a?.adversarialContainerNoNetworkAudits;
      const imports = a?.importedAdversarialAudits;
      const unrepaired = a?.unrepairedBypasses;
      return `| \`${s.familyId}\` | ${threat === undefined ? "n/a" : threat ? "yes" : "no"} | ${ready === undefined ? "n/a" : ready ? "yes" : "no"} | ${isolation === undefined ? "n/a" : isolation ? "yes" : "no"} | ${replay === undefined ? "n/a" : replay ? "yes" : "no"} | ${probes === undefined ? "n/a" : probes ? "pass" : "fail"} | ${noBypass === undefined ? "n/a" : noBypass} | ${containerAudits === undefined ? "n/a" : containerAudits} | ${imports === undefined ? "n/a" : imports} | ${unrepaired === undefined ? 0 : unrepaired} | ${a?.adversarialClaimLevel ?? "audit-pending"} |`;
    }),
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

// ---------------------------------------------------------------- readiness stages

/**
 * The stages a family passes through, and the decision at the end.
 *
 * `verdict` answers "may this ship". It cannot answer "what should happen to this", and the two got
 * conflated every time a family sat at HOLD for two different reasons: one waiting for a trial, one
 * waiting to be rebuilt. A stage says how far the family got; a decision says what to do next.
 */
export const READINESS_STAGES = [
  "declared",
  "verifier-valid",
  "mutant-discriminating",
  "challenge-packaged",
  "trial-ready",
  "difficulty-evidenced",
  "shared-bank-measured",
] as const;
export type ReadinessStage = (typeof READINESS_STAGES)[number];

export const FAMILY_DECISIONS = ["SHIP", "EVOLVE", "KILL", "HOLD", "REPAIR"] as const;
export type FamilyDecision = (typeof FAMILY_DECISIONS)[number];

export interface FamilyStatus {
  readonly familyId: string;
  /** The furthest stage reached. Stages are ordered and a family reaches them in order. */
  readonly stage: ReadinessStage;
  readonly decision: FamilyDecision;
  readonly reason: string;
  readonly blockingFailures: readonly string[];
}

const passed = (a: FamilyAssessment, id: string): boolean =>
  a.results.find((r) => r.gate.id === id)?.verdict === "pass";

/**
 * Derive the stage and the decision from the gate table and the kill disposition.
 *
 * The decision is NOT a fourth verdict invented here: it reads the kill analysis for a family that
 * failed something, which is where the taxonomy already decided whether a failure is a defect to
 * repair, a weakness to evolve, or an absence to measure.
 */
export function familyStatus(
  familyId: string,
  assessment: FamilyAssessment,
  disposition: string | null,
): FamilyStatus {
  const stage: ReadinessStage = passed(assessment, "shared-bank-ready")
    ? "shared-bank-measured"
    : passed(assessment, "difficulty-evidenced")
      ? "difficulty-evidenced"
      : passed(assessment, "trial-ready")
        ? "trial-ready"
        : passed(assessment, "mutants-caught-by-intended-check")
          ? "mutant-discriminating"
          : passed(assessment, "reference-passes")
            ? "verifier-valid"
            : "declared";

  const decision: FamilyDecision =
    assessment.verdict === "SHIP"
      ? "SHIP"
      : disposition === "harden" || disposition === "mutate"
        ? "EVOLVE"
        : disposition === "repair"
          ? "REPAIR"
          : disposition === "abandon"
            ? "KILL"
            : "HOLD";

  return {
    familyId,
    stage,
    decision,
    blockingFailures: assessment.blockingFailures,
    reason:
      decision === "SHIP"
        ? "every blocking gate passes and a counted agent trial failed something"
        : decision === "EVOLVE"
          ? "the family works and does not measure enough; the kill analysis says harden or mutate"
          : decision === "REPAIR"
            ? "a defect in the family itself must be fixed before any evidence from it counts"
            : decision === "KILL"
              ? "nothing here is salvageable"
              : `waiting on ${assessment.blockingFailures.join(", ") || "evidence"}`,
  };
}

/**
 * Contradictions a status must never express.
 *
 * Each of these was reachable at some point in this repository's history, which is why they are
 * assertions rather than documentation.
 */
export function assertStatusCoherent(status: FamilyStatus, evidence: FamilyEvidence | undefined): void {
  if (status.decision === "SHIP" && (evidence?.countedAgentTrials ?? 0) === 0) {
    fail(
      "STATUS_SHIP_WITHOUT_TRIALS",
      `status.${status.familyId}`,
      "SHIP with zero counted agent trials: the only evidence is mutants the author wrote, which is a statement about the verifier",
    );
  }
  if (
    status.decision === "SHIP" &&
    evidence !== undefined &&
    evidence.countedAgentTrials > 0 &&
    evidence.agentTrialsPassed === evidence.countedAgentTrials
  ) {
    fail(
      "STATUS_SHIP_ALREADY_SOLVED",
      `status.${status.familyId}`,
      "SHIP with every counted trial passing: a family nothing fails separates nothing",
    );
  }
  if (status.stage === "difficulty-evidenced" && (evidence?.countedAgentTrials ?? 0) === 0) {
    fail(
      "STATUS_STAGE_WITHOUT_EVIDENCE",
      `status.${status.familyId}`,
      "claims the difficulty-evidenced stage with no counted agent trial",
    );
  }
}
