import { SPEC_MD } from "../families/trading-reconciliation-recompute/spec.js";
import { buildScenario } from "../families/trading-reconciliation-recompute/truth.js";
import type { ScenarioParams } from "../families/trading-reconciliation-recompute/truth.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const TRADING_RECONCILIATION_HIDDEN_ARTIFACTS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "truth.ts",
  "matrix.json",
  "answer-matrix.json",
  "reports/",
] as const;

const README = `# Challenge: trading order reconciliation

## The problem

A venue may accept an order immediately before its response is lost. A later reconciler must retry
safely after authority changes. Implement reconciliation from the durable order intent and the
idempotent synthetic venue facade.

## What you are given

| file | what it is |
|---|---|
| \`SPEC.md\` | the complete normative rules and hidden-scenario dimensions |
| \`types.ts\` | the public subject and venue interfaces |
| \`starter/subject.mjs\` | a deliberately incorrect authority-epoch implementation |
| \`examples/\` | visible examples of the public recovery view |

## What you must produce

Write \`submission/subject.mjs\` exporting \`subject.run(view, venue)\`. Do not modify \`challenge/\`.

## How you are graded

The grader owns the venue call and execution ledgers. It checks that the committed client-order key
is recovered, retries collectively create one execution, valid work completes, and reports match
calls. No price, fill, exchange-priority, or private trading rule is graded.
`;

const STARTER = `// Deliberately wrong after reconciliation authority changes.
// Read SPEC.md, then recover the committed key from the durable order intent.

export const subject = {
  id: "starter",
  label: "Current-authority order-key recomputation starter",
  run(view, venue) {
    // WRONG: authorityEpoch changes when a new reconciler takes ownership.
    const idempotencyKey =
      \`order::\${view.intent.orderIntentId}::\${view.intent.clientRequestId}::authority-\${view.authorityEpoch}\`;
    const receipt = venue.placeOrder(view.intent.orderIntentId, {
      idempotencyKey,
      accountId: view.intent.accountId,
      symbol: view.intent.symbol,
      side: view.intent.side,
      quantity: view.intent.quantity,
    });
    return {
      orderIntentId: view.intent.orderIntentId,
      reconcilerId: view.reconcilerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey,
      outcome: "accepted",
      venueAccepted: receipt.accepted,
    };
  },
};
`;

const EXAMPLES: readonly {
  readonly label: string;
  readonly params: ScenarioParams;
  readonly note: string;
}[] = [
  {
    label: "single-reconciler",
    params: { seed: 41, nReconcilers: 1, orders: 4, crashPosition: "after_venue_accept" },
    note: "No replacement reconciler arrives, so the committed authority-0 key is used once.",
  },
  {
    label: "authority-transfer",
    params: { seed: 11, nReconcilers: 2, orders: 4, crashPosition: "after_venue_accept" },
    note: "The second reconciler sees epoch 7 and must recover the committed authority-0 key.",
  },
  {
    label: "clean-submission",
    params: { seed: 23, nReconcilers: 4, orders: 12, crashPosition: "none" },
    note: "Without an uncertain accepted order, only the first submission is made.",
  },
];

const examples = (): readonly ChallengeFile[] =>
  EXAMPLES.map((entry, index) => {
    const scenario = buildScenario(entry.params);
    return {
      path: `examples/example-${index + 1}-${entry.label}.json`,
      content: `${JSON.stringify({ views: scenario.views, note: entry.note }, null, 2)}\n`,
    };
  });

export function buildTradingReconciliationChallengePackage(
  typesSource: string,
  scenarioSetId: string,
): ChallengePackage {
  const files: ChallengeFile[] = [
    { path: "README.md", content: README },
    {
      path: "SPEC.md",
      content: SPEC_MD,
    },
    {
      path: "types.ts",
      content: [
        "// Public domain model. Hidden truth, verifier, scenario selection and ledgers are absent.",
        "",
        typesSource,
      ].join("\n"),
    },
    { path: "starter/subject.mjs", content: STARTER },
    ...examples(),
  ];
  const manifest: ChallengeManifest = {
    familyId: "trading-reconciliation-recompute",
    scenarioSetId,
    visibleFiles: files.map((file) => file.path).sort(),
    hiddenArtifacts: [...TRADING_RECONCILIATION_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with run(view, venue)",
  };
  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
