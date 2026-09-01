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
| \`starter/subject.mjs\` | a stub with the required export shape |
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
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots and subject-written claims
// may be stale or false.

const completed = new Set();

const auditEvent = (seq, actionId, reason, policy, delegation, token, remainingBudget, detail) => ({
  seq,
  actionId,
  reason,
  observedPolicyId: policy?.id ?? null,
  observedPolicyGeneration: policy?.generation ?? null,
  observedPolicyStatus: policy?.status ?? null,
  observedPolicyMaxPerSpend: policy?.maxPerSpend ?? null,
  observedPolicyDailyLimit: policy?.dailyLimit ?? null,
  observedDelegationId: delegation?.id ?? null,
  observedDelegationGeneration: delegation?.generation ?? null,
  observedDelegationStatus: delegation?.status ?? null,
  observedDelegationScope: delegation?.scope ?? null,
  observedDelegationMaxPerSpend: delegation?.maxPerSpend ?? null,
  observedDelegationExpiresAt: delegation?.expiresAt ?? null,
  observedTokenId: token?.id ?? null,
  observedTokenGeneration: token?.generation ?? null,
  observedTokenStatus: token?.status ?? null,
  observedTokenScope: token?.scope ?? null,
  observedTokenMaxPerSpend: token?.maxPerSpend ?? null,
  observedRemainingBudget: remainingBudget,
  usedSubjectAuthorityClaim: false,
  detail,
});

export const subject = {
  id: "starter",
  label: "Starter stub - replace me",

  run(view, authority) {
    const policy = authority.currentPolicy(view.request.policyId);
    const delegation = authority.currentDelegation(view.request.delegationId);
    const token = authority.currentToken(view.request.tokenId);
    const remainingBudget = authority.remainingBudget(view.request.walletId, view.request.owner);
    const actionId = view.request.id;
    const audit = [
      auditEvent(1, actionId, "OBSERVED", policy, delegation, token, remainingBudget, "observed current wallet authority"),
    ];

    let allowed = false;
    let reason = "DWS1_CURRENT_POLICY_REQUIRED";
    const completionKey = view.request.idempotencyKey;

    if (completed.has(completionKey)) {
      reason = "DWS8_NO_DUPLICATE_SPEND";
    } else if (policy === null || policy.status !== "active") {
      reason = "DWS1_CURRENT_POLICY_REQUIRED";
    } else if (
      delegation === null ||
      delegation.status !== "active" ||
      delegation.generation !== view.request.delegationGeneration ||
      delegation.owner !== view.request.owner ||
      delegation.delegate !== view.request.delegate ||
      delegation.walletId !== view.request.walletId ||
      delegation.expiresAt <= view.request.observedAt
    ) {
      reason = "DWS2_CURRENT_DELEGATION_REQUIRED";
    } else if (
      token === null ||
      token.status !== "active" ||
      token.generation !== view.request.tokenGeneration ||
      token.generation !== delegation.generation ||
      token.delegate !== view.request.delegate ||
      token.walletId !== view.request.walletId ||
      token.issuedFromDelegationId !== delegation.id
    ) {
      reason = "DWS3_CURRENT_TOKEN_REQUIRED";
    } else if (view.request.requestedScope !== "spend" || delegation.scope !== "spend" || token.scope !== "spend") {
      reason = "DWS4_DELEGATION_SCOPE_REQUIRED";
    } else {
      const allowedLimit = Math.min(policy.maxPerSpend, delegation.maxPerSpend, token.maxPerSpend);
      if (view.request.amount > allowedLimit) {
        reason = "DWS5_REQUEST_WITHIN_CURRENT_LIMIT";
      } else if (remainingBudget === null || view.request.amount > remainingBudget) {
        reason = "DWS6_REMAINING_BUDGET_REQUIRED";
      } else {
        allowed = true;
        reason = "ALLOWED";
        authority.executeSpend(actionId, {
          policyId: view.request.policyId,
          delegationId: view.request.delegationId,
          tokenId: view.request.tokenId,
          owner: view.request.owner,
          delegate: view.request.delegate,
          walletId: view.request.walletId,
          amount: view.request.amount,
          idempotencyKey: view.request.idempotencyKey,
        });
        completed.add(completionKey);
      }
    }

    audit.push(auditEvent(2, actionId, reason, policy, delegation, token, remainingBudget, "decision recorded"));
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
