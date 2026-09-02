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
// This is a SKELETON, not a working control layer: it reads the facade, refuses everything with one
// placeholder reason code, and writes an audit event with none of the observed fields filled in. It
// fails almost every hidden scenario as shipped. Replace the marked sections.
//
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots in \`view\` may be stale.
// SPEC.md holds the rules, the reason codes, and the audit fields every decision must carry.

export const subject = {
  id: "starter",
  label: "Starter skeleton - not an implementation",

  run(view, authority) {
    const actionId = view.request.id;
    const approval = authority.currentApproval(view.request.approvalId);
    const token = authority.currentToken(view.request.tokenId);

    // TODO: decide this request from \`approval\` and \`token\` above - the current authority - rather
    // than from view.cachedApproval / view.cachedToken, and apply the rules in SPEC.md in order.
    // Replace the placeholder below with the decision and the governing reason code.
    const allowed = false;
    const reason = "ATS1_CURRENT_APPROVAL_REQUIRED";

    // TODO: when (and only when) the request is authorized, issue exactly one grant:
    //   authority.issueToken(actionId, { approvalId, tokenId, principal, resource, scope });
    // The grant payload you send is graded against the request AND the current approval, so it must
    // carry exactly the approved authority and nothing broader.

    // TODO: replace the nulls with the current authority facts this decision actually used, and add
    // whatever further audit events SPEC.md requires.
    const audit = [
      {
        seq: 1,
        actionId,
        reason,
        observedApprovalId: null,
        observedApprovalGeneration: null,
        observedApprovalStatus: null,
        observedTokenId: null,
        observedTokenGeneration: null,
        observedTokenStatus: null,
        observedScope: null,
        observedResource: null,
        observedPrincipal: null,
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
