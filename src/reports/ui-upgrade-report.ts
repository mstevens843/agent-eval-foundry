// What the UI replay family models, what it does not, and what a browser would add.
//
// The family is strategically the most interesting one here — "agents getting hands in real UIs" is
// where the money is — and it is also the one most at risk of being taken for more than it is. It
// runs against a deterministic tree, not a browser. Six measured axes says the verifier separates ten
// mutants; it does not say a passing replayer would survive a real DOM.
//
// So this report is written to be read by someone deciding whether to trust it. It states what is
// modelled, what is simulated, and what each missing piece would cost — with the fidelity claim
// separated from the measurement claim throughout, because the measurement is real and the fidelity
// is partial and the two are constantly merged.

import type { FamilySweep } from "../families/registry.js";
import type { CampaignPlan } from "../trials/campaign.js";
import type { AxisReport } from "../types.js";

export interface UiUpgradeInput {
  readonly sweep: FamilySweep;
  readonly axis: AxisReport;
  readonly plan: CampaignPlan | null;
  readonly challengeFiles: number;
  readonly challengeHash: string;
  readonly countedTrials: number;
}

interface Modelled {
  readonly capability: string;
  readonly modelled: "real" | "simulated" | "absent";
  readonly how: string;
  readonly gradedBy: string;
}

const MODEL_TABLE: readonly Modelled[] = [
  {
    capability: "recording a discovered workflow as a replayable artifact",
    modelled: "real",
    how: "a typed action trace: ordered steps, each with a selector, a precondition and a postcondition",
    gradedBy: "`replay_completes`, `replay_audit_explains`",
  },
  {
    capability: "replaying with no model in the loop",
    modelled: "real",
    how: "`app.askModel` exists, works, and every call is recorded by the harness",
    gradedBy: "`no_model_in_loop`",
  },
  {
    capability: "selector drift between record and replay",
    modelled: "simulated",
    how: "six declared mutations — rename, reorder, wrap-and-remount, text change, removal, none — applied at a declared depth",
    gradedBy: "`selector_resolved_live`, `unreplayable_reported`",
  },
  {
    capability: "semantic preconditions",
    modelled: "real",
    how: "each step declares an attribute and the value it must hold; the replayer must read it live rather than trust the recording",
    gradedBy: "`precondition_observed`",
  },
  {
    capability: "hidden confirmation state",
    modelled: "real",
    how: "three states — absent, present, suppressed — with the flow declaring in the tree whether it confirms at all",
    gradedBy: "`confirmation_observed`",
  },
  {
    capability: "duplicate side effects",
    modelled: "real",
    how: "an effect ledger the subject cannot read, and a scenario knob that replays the same trace twice",
    gradedBy: "`replay_idempotent`",
  },
  {
    capability: "stale UI state / async settling",
    modelled: "simulated",
    how: "a region that resolves as `pending` rather than missing, so 'not yet' and 'gone' are distinguishable",
    gradedBy: "`replay_completes`, `unreplayable_reported`",
  },
  {
    capability: "action audit truth",
    modelled: "real",
    how: "the verifier re-resolves every recorded selector against the live tree instead of trusting the audit",
    gradedBy: "`selector_resolved_live`, `replay_audit_explains`",
  },
  {
    capability: "a real browser: layout, timing, focus, scroll, iframes, shadow DOM",
    modelled: "absent",
    how: "the application is a deterministic tree with no renderer",
    gradedBy: "nothing — and this is the fidelity limit, stated rather than implied",
  },
];

export function renderUiUpgradeReport(input: UiUpgradeInput): string {
  const real = MODEL_TABLE.filter((m) => m.modelled === "real").length;
  const simulated = MODEL_TABLE.filter((m) => m.modelled === "simulated").length;

  return [
    "# UI action record and replay — what is modelled",
    "",
    "**Thesis.** A model can discover a UI workflow. The capability worth shipping is a recording that",
    "replays deterministically **with no model in the loop**, because a workflow needing the model on",
    "every run is a demo with a subscription.",
    "",
    `**State.** Measured against ${input.sweep.mutantsCaught.length} mutants over ${input.sweep.scenarioCount} scenarios:`,
    `reference clean, every mutant caught by its intended check, **${input.axis.independentAxes} independent axes** —`,
    "the widest structure in this repository. Challenge package builds and passes its leak check",
    `(${input.challengeFiles} files, hash \`${input.challengeHash}\`).`,
    "",
    input.countedTrials === 0
      ? "**No agent trial has been run.** The axis count is a statement about the verifier."
      : `${input.countedTrials} counted agent trial(s) exist.`,
    "",
    "## What the family models, and how honestly",
    "",
    `${real} capabilities are modelled for real, ${simulated} are simulated, one is absent.`,
    "",
    "| capability | modelled | how | graded by |",
    "|---|---|---|---|",
    ...MODEL_TABLE.map(
      (m) =>
        `| ${m.capability} | ${m.modelled === "real" ? "**real**" : m.modelled === "simulated" ? "simulated" : "**absent**"} | ${m.how} | ${m.gradedBy} |`,
    ),
    "",
    '"Real" here means the property is decided by something the subject cannot influence — an effect',
    'ledger, a call ledger, or the verifier re-resolving selectors itself. "Simulated" means the',
    "phenomenon is modelled faithfully in a tree rather than observed in a renderer.",
    "",
    "## The fidelity limit, stated plainly",
    "",
    "The application is a deterministic tree. There is no layout, no timing, no focus management, no",
    "scrolling, no iframes and no shadow DOM. A replayer that passes here has demonstrated that it",
    "carries state correctly across a changing structure; it has **not** demonstrated that it survives",
    "a real page.",
    "",
    "That is a fidelity claim, and it is separate from the measurement claim. The measurement is real:",
    "ten mutants, each a one-line diff from the reference, each caught by the check it was written to",
    "trip, and six independent axes over that bank. What the measurement is ABOUT is a simplified",
    "world.",
    "",
    "## What a browser-backed harness would add, and cost",
    "",
    "| addition | what it would newly measure | rough cost |",
    "|---|---|---|",
    "| a real DOM via a headless browser | layout-dependent selectors, scroll and visibility preconditions, focus stealing | 25–40 h, plus a browser dependency in the trial sandbox |",
    "| real timing | races between replay and hydration, retry policy under genuine latency | 15 h, and every scenario becomes nondeterministic unless the clock is controlled |",
    "| a recorded real application | whether traces from production apps replay at all | large, and it changes the family from a measurement into a dataset |",
    "",
    "The honest ordering is that the FIRST of those is worth doing only after a counted agent trial on",
    "the current family. If a capable model already fails the deterministic version — and the memory",
    "family showed that a well-built family can — then the simplified world is discriminating and a",
    "browser adds fidelity to a measurement that already exists. If every model passes, a browser would",
    "buy a more realistic version of a task nobody fails.",
    "",
    ...(input.plan === null
      ? []
      : [
          "## The campaign that would settle it",
          "",
          `\`${input.plan.campaignId}\` is written and unrun: ${input.plan.slots.length} slots, ${input.plan.slots.filter((s) => s.state === "NOT_RUN").length} not run.`,
          "",
          `**Kill signal:** ${input.plan.killSignal}`,
          "",
          `**Confirm signal:** ${input.plan.confirmSignal}`,
          "",
          "Every slot is runnable with one command; the challenge package and the router already exist.",
          "The reason it has not run is stated in the plan rather than left as an absence.",
          "",
        ]),
    "## Mutants and what each one proves",
    "",
    "| mutant | must fail | caught in |",
    "|---|---|---:|",
    ...input.sweep.mutantsCaught.map(
      (m) => `| \`${m.mutantId}\` | \`${m.check}\` | ${m.caughtIn}/${m.total} |`,
    ),
    "",
    "The one worth reading is `model-in-the-loop`: it frequently **succeeds** at the flow — improvising",
    "past a renamed attribute genuinely completes the checkout — and fails anyway, because the harness",
    "owns the channel it improvised through. A family that only checked outcomes would score it as the",
    "best implementation in the bank.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
