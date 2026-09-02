import { buildScenario } from "../families/delegated-wallet-scope-reconciliation/scenarios.js";
import { SPEC_MD } from "../families/delegated-wallet-scope-reconciliation/spec.js";
import type { ScenarioParams } from "../families/delegated-wallet-scope-reconciliation/truth.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const DELEGATED_WALLET_HIDDEN_ARTIFACTS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "truth.ts",
  "matrix.json",
  "scenarios.json",
  "answer-matrix.json",
  "reports/",
] as const;

const README = `# Challenge: delegated wallet scope reconciliation

## The problem

You are building a wallet-spend control layer for an agent with delegated authority. A wallet owner
may grant a delegate a limited spend authority. The delegate may cache policy, delegation and token
snapshots, but those snapshots can become stale before the spend executes.

Implement a deterministic subject that reconciles the current wallet policy, current delegation,
current wallet token and remaining budget before spending. Spend only when current authority allows
the exact action, and record an audit trail explaining what current facts governed the decision.

## What you are given

| file | what it is |
|---|---|
| \`SPEC.md\` | the normative rules and interface contract |
| \`types.ts\` | the public domain model |
| \`starter/subject.mjs\` | a non-working skeleton with the required export shape; it refuses everything and audits nothing |
| \`examples/\` | visible scenarios showing the public input format |

## What you must produce

A single ES module at \`submission/subject.mjs\`:

\`\`\`js
export const subject = {
  id: "my-implementation",
  label: "...",
  run(view, authority) {
    return { decisions: [{ actionId, allowed, reason }], audit: [...] };
  },
};
\`\`\`

The grader may call \`run\` twice for the same spend request. The current authority state is rebuilt
for each attempt, but the wallet effect ledger is shared. Duplicate irreversible spends fail.

## How you are graded

Hidden scenarios sample the state space declared in \`SPEC.md\`; they add no hidden rules. The hidden
verifier compares your decisions and audit to verifier-owned policy, delegation, token, budget,
facade-call and spend-effect ledgers. Cached snapshots and subject-owned receipts may be stale or
false.

Allowed assumptions: all hidden cases stay inside the declared space in \`SPEC.md\`, the authority
facade methods are the only current authority source, and examples illustrate format rather than
exhaustive coverage.

Refusing everything fails. Trusting requested, cached or subject-owned authority fails. Reporting a
spend without the authority-owned effect fails.
`;

const STARTER = `// Starter. Implement \`run\` and export \`subject\`.
//
// This is a SKELETON, not a working control layer: it reads the facade, refuses everything with one
// placeholder reason code, and writes an audit event with none of the observed fields filled in. It
// fails almost every hidden scenario as shipped. Replace the marked sections.
//
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots and subject-written claims
// may be stale or false. SPEC.md holds the rules, the reason codes, and the audit fields every
// decision must carry.

export const subject = {
  id: "starter",
  label: "Starter skeleton - not an implementation",

  run(view, authority) {
    const actionId = view.request.id;
    const policy = authority.currentPolicy(view.request.policyId);
    const delegation = authority.currentDelegation(view.request.delegationId);
    const token = authority.currentToken(view.request.tokenId);
    const remainingBudget = authority.remainingBudget(view.request.walletId, view.request.owner);

    // TODO: reconcile the four current facts above and decide the spend from them - not from
    // view.cachedPolicy / view.cachedDelegation / view.cachedToken and not from any subject-owned
    // authority claim in the view. Apply the rules in SPEC.md in order and replace the placeholder
    // below with the decision and the governing reason code.
    const allowed = false;
    const reason = "DWS1_CURRENT_POLICY_REQUIRED";

    // TODO: when (and only when) current authority allows it, execute exactly one spend:
    //   authority.executeSpend(actionId, { policyId, delegationId, tokenId, owner, delegate,
    //                                      walletId, amount, idempotencyKey });
    // The effect payload you send is graded against the request and the current authority, so it
    // must carry exactly the authorized spend and nothing broader.

    // TODO: replace the nulls with the current authority facts this decision actually used, and add
    // whatever further audit events SPEC.md requires.
    const audit = [
      {
        seq: 1,
        actionId,
        reason,
        observedPolicyId: null,
        observedPolicyGeneration: null,
        observedPolicyStatus: null,
        observedPolicyMaxPerSpend: null,
        observedPolicyDailyLimit: null,
        observedDelegationId: null,
        observedDelegationGeneration: null,
        observedDelegationStatus: null,
        observedDelegationScope: null,
        observedDelegationMaxPerSpend: null,
        observedDelegationExpiresAt: null,
        observedTokenId: null,
        observedTokenGeneration: null,
        observedTokenStatus: null,
        observedTokenScope: null,
        observedTokenMaxPerSpend: null,
        observedRemainingBudget: null,
        usedSubjectAuthorityClaim: false,
        detail: "TODO: cite the current authority facts behind this decision",
      },
    ];

    return { decisions: [{ actionId, allowed, reason }], audit };
  },
};
`;

const EXAMPLE_PARAMS: readonly {
  readonly label: string;
  readonly params: ScenarioParams;
  readonly note: string;
}[] = [
  {
    label: "valid-narrow-spend",
    params: {
      seed: 11,
      initialApprovedLimit: 100,
      requestedAmount: 60,
      authorityTransition: "stable",
      tokenState: "exact",
      cacheFreshness: "fresh",
      priorSpend: "none",
      policySource: "available",
      requestSurface: "wallet_api",
      repeatCount: 1,
    },
    note: "Current policy, delegation, token and budget authorize the spend, so one effect may execute.",
  },
  {
    label: "downgraded-after-cache",
    params: {
      seed: 23,
      initialApprovedLimit: 250,
      requestedAmount: 140,
      authorityTransition: "downgraded",
      tokenState: "exact",
      cacheFreshness: "stale",
      priorSpend: "none",
      policySource: "available",
      requestSurface: "delegated_tool",
      repeatCount: 1,
    },
    note: "The cached delegation still looks broad, but current delegated authority is narrower.",
  },
  {
    label: "revoked-delegation",
    params: {
      seed: 41,
      initialApprovedLimit: 100,
      requestedAmount: 25,
      authorityTransition: "revoked",
      tokenState: "exact",
      cacheFreshness: "stale_broader",
      priorSpend: "none",
      policySource: "available",
      requestSurface: "scheduled_worker",
      repeatCount: 1,
    },
    note: "Subject-owned or cached claims cannot override current revoked delegation state.",
  },
  {
    label: "duplicate-retry",
    params: {
      seed: 67,
      initialApprovedLimit: 250,
      requestedAmount: 60,
      authorityTransition: "stable",
      tokenState: "exact",
      cacheFreshness: "fresh",
      priorSpend: "some",
      policySource: "available",
      requestSurface: "wallet_api",
      repeatCount: 2,
    },
    note: "The first valid spend may execute. The second attempt must not duplicate the effect.",
  },
];

function typesFor(typesSource: string): string {
  return [
    "// Public domain model for the challenge.",
    "// Hidden truth, scenarios, verifier and mutants are deliberately absent.",
    "",
    typesSource,
  ].join("\n");
}

function examples(): readonly ChallengeFile[] {
  return EXAMPLE_PARAMS.map((entry, i) => {
    const scenario = buildScenario(entry.params);
    return {
      path: `examples/example-${i + 1}-${entry.label}.json`,
      content: `${JSON.stringify(
        {
          view: scenario.view,
          replayCount: scenario.params.repeatCount,
          note: entry.note,
        },
        null,
        2,
      )}\n`,
    };
  });
}

export function buildDelegatedWalletChallengePackage(
  typesSource: string,
  scenarioSetId: string,
): ChallengePackage {
  const files: ChallengeFile[] = [
    { path: "README.md", content: README },
    { path: "SPEC.md", content: SPEC_MD },
    { path: "types.ts", content: typesFor(typesSource) },
    { path: "starter/subject.mjs", content: STARTER },
    ...examples(),
  ];

  const manifest: ChallengeManifest = {
    familyId: "delegated-wallet-scope-reconciliation",
    scenarioSetId,
    visibleFiles: files.map((f) => f.path).sort(),
    hiddenArtifacts: [...DELEGATED_WALLET_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with run(view, authority)",
  };

  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
