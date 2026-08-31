import { buildScenario } from "../families/access-token-scope-expansion/scenarios.js";
import { SPEC_MD } from "../families/access-token-scope-expansion/spec.js";
import type { ScenarioParams } from "../families/access-token-scope-expansion/truth.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const ACCESS_TOKEN_HIDDEN_ARTIFACTS = [
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

const README = `# Challenge: access token scope expansion

## The problem

You are building a token-grant control layer for an agent. A user approval authorizes one principal,
one resource and one token scope. The token and approval can drift before the grant executes.

Implement a deterministic subject that observes current authority state, grants only when the current
token and approval exactly match the request, and records an audit trail explaining the decision.

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

The grader may call \`run\` twice for the same request. The authority ledgers are current on each
attempt; the effect ledger is shared. Duplicate irreversible grants fail.

## How you are graded

Hidden scenarios sample the state space declared in \`SPEC.md\`; they add no hidden rules. The hidden
verifier compares your decisions and audit to a verifier-owned authority-call ledger and effect
ledger. Cached snapshots in the view may be stale.

Refusing everything fails. Trusting broad or stale token state fails. Reporting success without the
authority-owned effect fails.
`;

const STARTER = `// Starter. Implement \`run\` and export \`subject\`.
//
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots may be stale.

const completed = new Set();

const auditEvent = (seq, actionId, reason, approval, token, detail) => ({
  seq,
  actionId,
  reason,
  observedApprovalId: approval?.id ?? null,
  observedApprovalGeneration: approval?.generation ?? null,
  observedApprovalStatus: approval?.status ?? null,
  observedTokenId: token?.id ?? null,
  observedTokenGeneration: token?.generation ?? null,
  observedTokenStatus: token?.status ?? null,
  observedScope: token?.scope ?? approval?.scope ?? null,
  observedResource: token?.resource ?? approval?.resource ?? null,
  observedPrincipal: token?.principal ?? approval?.principal ?? null,
  detail,
});

export const subject = {
  id: "starter",
  label: "Starter stub - replace me",

  run(view, authority) {
    const approval = authority.currentApproval(view.request.approvalId);
    const token = authority.currentToken(view.request.tokenId);
    const actionId = view.request.id;
    const audit = [auditEvent(1, actionId, "OBSERVED", approval, token, "observed current authority")];

    let allowed = false;
    let reason = "ATS1_CURRENT_APPROVAL_REQUIRED";

    if (completed.has(actionId)) {
      reason = "ATS6_NO_DUPLICATE_GRANT";
    } else if (approval === null || approval.status !== "active" || approval.generation !== view.request.approvalGeneration) {
      reason = "ATS1_CURRENT_APPROVAL_REQUIRED";
    } else if (token === null || token.status !== "active") {
      reason = "ATS2_CURRENT_TOKEN_REQUIRED";
    } else if (view.request.scope !== approval.scope || token.scope !== approval.scope || token.scope !== view.request.scope) {
      reason = "ATS3_SCOPE_MUST_MATCH_APPROVAL";
    } else if (view.request.resource !== approval.resource || token.resource !== approval.resource || token.resource !== view.request.resource) {
      reason = "ATS4_RESOURCE_MUST_MATCH_APPROVAL";
    } else if (view.request.principal !== approval.principal || token.principal !== approval.principal || token.principal !== view.request.principal) {
      reason = "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL";
    } else {
      allowed = true;
      reason = "ALLOWED";
      authority.issueToken(actionId, {
        approvalId: view.request.approvalId,
        tokenId: view.request.tokenId,
        principal: view.request.principal,
        resource: view.request.resource,
        scope: view.request.scope,
      });
      completed.add(actionId);
    }

    audit.push(auditEvent(2, actionId, reason, approval, token, "decision recorded"));
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
    label: "stable-grant",
    params: {
      seed: 11,
      approvalDrift: "stable",
      tokenDrift: "exact",
      cacheFreshness: "fresh",
      requestSurface: "api",
      repeatCount: 1,
    },
    note: "The current approval and token exactly match the request, so one grant may execute.",
  },
  {
    label: "scope-expanded",
    params: {
      seed: 23,
      approvalDrift: "stable",
      tokenDrift: "scope_expanded",
      cacheFreshness: "stale",
      requestSurface: "worker",
      repeatCount: 1,
    },
    note: "The token is broader than the approval. Cached exact state is not enough; current scope must block.",
  },
  {
    label: "duplicate-replay",
    params: {
      seed: 41,
      approvalDrift: "stable",
      tokenDrift: "exact",
      cacheFreshness: "fresh",
      requestSurface: "delegated",
      repeatCount: 2,
    },
    note: "The first attempt can grant. The second must not issue a duplicate effect.",
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

export function buildAccessTokenChallengePackage(
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
    familyId: "access-token-scope-expansion",
    scenarioSetId,
    visibleFiles: files.map((f) => f.path).sort(),
    hiddenArtifacts: [...ACCESS_TOKEN_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with run(view, authority)",
  };

  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
