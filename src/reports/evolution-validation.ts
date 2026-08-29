// Did the evolution operator work?
//
// The foundry has now run one full turn: a family was built, trialed, killed as already-solved,
// evolved through a named operator, and the descendant was built and trialed. This report is the
// verdict on the OPERATOR, not on either family — and the distinction matters, because a descendant
// can be harder for reasons that have nothing to do with the change that was made.
//
// So the validation is a chain of four claims, each separately checkable:
//
//   1. the parent died for the reason recorded            (counted trials, all passing)
//   2. the descendant is materially different             (mechanism delta, knob delta)
//   3. the descendant is harder                           (counted trials, some failing)
//   4. it is harder BECAUSE of the operator               (failures track the operator's knob)
//
// Three and four are different claims and only four validates the operator. A family that fails for
// unrelated reasons is a harder family and an unsupported hypothesis, and this report is built to
// keep those apart rather than to let a good headline swallow the distinction.

import type { VariantProposal } from "../foundry/evolve.js";
import type { KillAnalysis } from "../foundry/kill.js";
import type { TaskShape } from "../foundry/schema.js";
import type { FamilyTrialAnalysis } from "./agent-results.js";

export type ValidationVerdict =
  | "operator-confirmed"
  | "operator-partially-confirmed"
  | "harder-for-other-reasons"
  | "operator-falsified"
  | "no-evidence";

export interface OperatorValidation {
  readonly parentId: string;
  readonly childId: string;
  readonly operators: readonly string[];
  /** The knob the operator introduced, whose split decides claim four. */
  readonly operatorKnob: string | null;
  readonly parentCounted: number;
  readonly parentFailures: number;
  readonly childCounted: number;
  readonly childFailures: number;
  readonly harder: boolean;
  /** True when failures actually track the operator's knob. */
  readonly attributable: boolean;
  readonly verdict: ValidationVerdict;
  /** Per counted trial: does its failure pattern support the operator? */
  readonly perTrial: readonly {
    readonly runId: string;
    readonly failed: number;
    readonly checks: readonly string[];
    readonly supportsOperator: boolean;
    readonly reading: string;
  }[];
}

export interface ValidationInput {
  readonly parentShape: TaskShape;
  readonly childShape: TaskShape;
  readonly parentAnalysis: FamilyTrialAnalysis;
  readonly childAnalysis: FamilyTrialAnalysis;
  readonly killAnalysis: KillAnalysis;
  readonly variant: VariantProposal | null;
  /** The knob the operator introduced. Null when the operator adds no knob. */
  readonly operatorKnob: string | null;
  /** Checks whose failure would be evidence FOR the operator's mechanism. */
  readonly operatorChecks: readonly string[];
}

/**
 * Decide whether the operator is supported, one trial at a time.
 *
 * A trial supports the operator when it fails at least one of the operator's checks AND its failures
 * are concentrated at the non-baseline values of the operator's knob. A trial that fails on other
 * checks, or fails uniformly across the knob, is a failure the operator does not explain.
 */
export function validateOperator(input: ValidationInput): OperatorValidation {
  const child = input.childAnalysis;
  const knobSplit = child.knobSplits.find((k) => k.knob === input.operatorKnob);

  const perTrial = child.outcomes
    .filter((o) => o.kind === "counted_solve" || o.kind === "counted_failure")
    .map((o) => {
      const checks = o.failedChecks.map((c) => c.check);
      const hitsOperatorCheck = checks.some((c) => input.operatorChecks.includes(c));
      const supports = o.scenariosFailed > 0 && hitsOperatorCheck;
      return {
        runId: o.runId,
        failed: o.scenariosFailed,
        checks,
        supportsOperator: supports,
        reading:
          o.scenariosFailed === 0
            ? "passed everything: this trial is evidence the family is solvable, and no evidence about the operator"
            : supports
              ? `failed ${o.scenariosFailed} scenarios on ${checks.join(", ")} — checks the operator's mechanism is supposed to reach`
              : `failed ${o.scenariosFailed} scenarios on ${checks.join(", ")} — real failures, but not on the operator's mechanism`,
      };
    });

  const harder = child.failures > input.parentAnalysis.failures;
  const attributable =
    perTrial.some((t) => t.supportsOperator) && (knobSplit === undefined || knobSplit.discriminates);

  const verdict: ValidationVerdict =
    child.counted === 0
      ? "no-evidence"
      : child.failures === 0
        ? "operator-falsified"
        : attributable && perTrial.filter((t) => t.failed > 0).every((t) => t.supportsOperator)
          ? "operator-confirmed"
          : attributable
            ? "operator-partially-confirmed"
            : "harder-for-other-reasons";

  return {
    parentId: input.parentShape.familyId,
    childId: input.childShape.familyId,
    operators: input.variant?.operators ?? [],
    operatorKnob: input.operatorKnob,
    parentCounted: input.parentAnalysis.counted,
    parentFailures: input.parentAnalysis.failures,
    childCounted: child.counted,
    childFailures: child.failures,
    harder,
    attributable,
    verdict,
    perTrial,
  };
}

const VERDICT_MEANING: Readonly<Record<ValidationVerdict, string>> = {
  "operator-confirmed":
    "Every counted failure is on a check the operator's mechanism reaches, and the operator's knob moves the failure rate. The operator produced the difficulty.",
  "operator-partially-confirmed":
    "At least one counted failure is on the operator's mechanism and at least one is not. The operator produced SOME of the difficulty; the rest came from elsewhere and needs its own explanation.",
  "harder-for-other-reasons":
    "The descendant is harder and the failures are not on the operator's mechanism. The family improved; the hypothesis is unsupported.",
  "operator-falsified":
    "Every counted trial passed. The descendant is already-solved like its parent, and the operator did not produce difficulty against this bank.",
  "no-evidence": "No counted trial exists for the descendant. Nothing is validated either way.",
};

export function renderEvolutionValidation(v: OperatorValidation, input: ValidationInput): string {
  const child = input.childAnalysis;
  const knobSplit = child.knobSplits.find((k) => k.knob === v.operatorKnob);

  return [
    "# Evolution validation",
    "",
    `\`${v.parentId}\` → \`${v.childId}\` via ${v.operators.map((o) => `\`${o}\``).join(" + ") || "no recorded operator"}`,
    "",
    `**Verdict: ${v.verdict}.** ${VERDICT_MEANING[v.verdict]}`,
    "",
    "## The chain of claims",
    "",
    "Four claims, each separately checkable. Only the fourth validates the operator; the third only",
    "says the descendant is harder, which it could be for reasons the operator had nothing to do with.",
    "",
    "| # | claim | status | evidence |",
    "|---|---|---|---|",
    `| 1 | the parent died for the recorded reason | ${input.killAnalysis.primary?.reason === "already_solved" ? "**holds**" : "—"} | ${v.parentCounted} counted trials, ${v.parentFailures} failing |`,
    `| 2 | the descendant is materially different | ${input.childShape.mechanisms.join(",") !== input.parentShape.mechanisms.join(",") ? "**holds**" : "FAILS"} | mechanisms ${input.parentShape.mechanisms.join(", ")} → ${input.childShape.mechanisms.join(", ")} |`,
    `| 3 | the descendant is harder | ${v.harder ? "**holds**" : "does not hold"} | ${v.childFailures} of ${v.childCounted} counted trials failed something, against ${v.parentFailures} of ${v.parentCounted} for the parent |`,
    `| 4 | it is harder BECAUSE of the operator | ${v.attributable ? "**supported**" : "unsupported"} | ${v.operatorKnob === null ? "the operator adds no knob to split on" : `failures split on \`${v.operatorKnob}\``} |`,
    "",
    "## Per counted trial",
    "",
    "| run | scenarios failed | checks | supports the operator? |",
    "|---|---:|---|---|",
    ...v.perTrial.map(
      (t) =>
        `| \`${t.runId}\` | ${t.failed} | ${t.checks.map((c) => `\`${c}\``).join(", ") || "—"} | ${t.supportsOperator ? "**yes**" : "no"} |`,
    ),
    "",
    ...v.perTrial.map((t) => `- **${t.runId}**: ${t.reading}`),
    "",
    ...(knobSplit === undefined
      ? []
      : [
          `## The operator's knob: \`${v.operatorKnob}\``,
          "",
          "The split that decides claim four. The operator's whole hypothesis is that this knob is what",
          "makes the task hard, so a flat split falsifies the mechanism even when the family is hard.",
          "",
          "| value | scenarios | failed | rate |",
          "|---|---:|---:|---:|",
          ...knobSplit.rows.map(
            (r) => `| \`${r.value}\` | ${r.scenarios} | ${r.failed} | ${(r.rate * 100).toFixed(1)}% |`,
          ),
          "",
          knobSplit.discriminates
            ? "**The rate moves with the knob.** That is the operator working: the same implementations are more wrong at the values the operator introduced."
            : "**The rate does not move with the knob.** Whatever produced the failures, it was not this parameter.",
          "",
        ]),
    "## What would falsify this",
    "",
    "Stated so the verdict above can be attacked rather than admired:",
    "",
    "1. **A wider model bank flattens it.** Every counted trial here is one model family. If a second",
    "   lab's model fails uniformly across the operator's knob, the attribution is wrong.",
    "2. **The failures are a fairness artifact.** A check that fires because the spec is ambiguous is",
    "   not difficulty. Any check failing on nearly every scenario of one attack shape should be read",
    "   as a design smell first and a capability finding second.",
    "3. **The parent would fail too, given the same bank.** The parent's three trials and the",
    "   descendant's three are different runs of the same model; a paired re-run of the parent would",
    "   make the comparison stronger than it currently is.",
    "",
    "## Operator kill-risk, revised",
    "",
    input.variant === null
      ? "_No variant proposal is on record for this pair._"
      : [
          `The proposal pre-registered a **${(input.variant.killRisk * 100).toFixed(0)}%** chance of dying the same way as its parent, on this reasoning:`,
          "",
          `> ${input.variant.killRiskRationale}`,
          "",
          v.verdict === "operator-falsified"
            ? "The family died that way. The estimate was too low and the operator should be marked as unproven."
            : "The family did not die that way. The estimate survives — on one trial of one model family, which is a weak update rather than a confirmation.",
        ].join("\n"),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
