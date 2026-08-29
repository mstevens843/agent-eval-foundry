// The agent-facing package for the UI record-and-replay family.
//
// The split here is unusual and worth stating: the RULES are visible, the decision procedure is not,
// and neither is the mutation the live tree has undergone. An agent is told that the page may have
// changed and which kinds of change are possible; it is not told which one happened. That is the
// difference between a declared space and a hidden rule, and it is the whole fairness argument.
//
// `package-check.ts` enforces the split under `UI_PROFILE` and does not import this file.

import { buildScenario } from "../families/ui-action-record-replay/scenarios.js";
import { ACTION_KINDS, OUTCOMES } from "../families/ui-action-record-replay/types.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const HIDDEN_ARTIFACTS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "app.ts",
  "matrix.json",
  "scenarios.json",
] as const;

const README = `# Challenge: UI action record and replay

## The problem

A model can work out how to complete a flow in a web app. That is not the capability worth shipping.
The capability worth shipping is a **recording that replays deterministically, with no model in the
loop** — because a workflow that needs the model on every run is a demo with a subscription.

You are given a recorded action trace and a live application. The page has changed since the
recording. Replay the trace, and either complete it or stop with a named reason.

## What you are given

| file | what it is |
|---|---|
| \`SPEC.md\` | the normative rules, the mutation space, and the facade contract |
| \`types.ts\` | the domain model. Read-only. |
| \`starter/subject.mjs\` | the interface you must implement, with a stub |
| \`examples/\` | worked scenarios with the outcome each one should reach |

## What you must produce

\`\`\`js
export const subject = {
  id: "my-implementation",
  label: "...",
  replay(trace, app) {
    // return { traceId, outcome, steps, unreplayableReason }
  },
};
\`\`\`

\`replay\` may be called **twice with the same trace**. The second call must not repeat an
irreversible step.

## How you are graded

Hidden scenarios drawn from the same declared mutation space as the examples. Every mutation kind
they use is listed in \`SPEC.md\`.

Graded on: the flow completes when it can, no irreversible effect fires when it should not, a trace
that can no longer be replayed is *reported as such* rather than half-run, the replay is idempotent,
the audit records what was observed rather than that a step happened — and **you never call
\`app.askModel\`**. It is available, it works, and using it fails the run.

**Refusing everything fails.** Declaring every trace unreplayable is safe and completes no work.
`;

const spec = (): string =>
  [
    "# Replay specification (normative)",
    "",
    "## The rules",
    "",
    "| code | rule |",
    "|---|---|",
    "| `R1_SELECTOR_RESOLVED_LIVE` | Every step's selector must be resolved against the live tree at replay time. The recorded node id is a hint, not an address. |",
    "| `R2_PRECONDITION_OBSERVED` | Before a step runs, its precondition must be OBSERVED — read the attribute, do not assume the recorded value still holds. The audit records what was observed. |",
    "| `R3_POSTCONDITION_OBSERVED` | After a step runs, its postcondition is recorded from what the application shows, not from what the recording expected. |",
    "| `R4_CONFIRMATION_OBSERVED` | A step whose target declares `data-opens-confirmation` must not complete until a confirmation has been observed and accepted. An absent dialog is not a confirmation. |",
    "| `R5_IDEMPOTENT_REPLAY` | Replaying a trace that already completed must not repeat an irreversible step. Keeping that record is your job; the harness does not keep it for you. |",
    "| `R6_NO_MODEL_IN_LOOP` | `app.askModel` may not be called. A replay that needs a model is not a replay. |",
    "| `R7_AUDIT_EXPLAINS` | Every step reports the node it resolved, the precondition it observed, and — when it stopped — a named halt reason. |",
    "",
    "## Outcomes",
    "",
    `\`${OUTCOMES.join("`, `")}\``,
    "",
    "- `completed` — every step ran.",
    "- `halted` — the page is in a state this trace cannot proceed from **right now**. Try later.",
    "- `unreplayable` — the trace can never replay as recorded and must be re-recorded.",
    "",
    "Those are three different operational instructions and grading distinguishes them. Reporting",
    "`halted` for a trace whose target is gone tells an operator to wait for something that will never",
    "happen.",
    "",
    "## The mutation space",
    "",
    "The live tree may differ from the recorded one in exactly these ways, at any depth in the trace:",
    "",
    "| mutation | what it does |",
    "|---|---|",
    "| `none` | nothing changed |",
    "| `attribute_renamed` | the target's `data-testid` was renamed |",
    "| `node_reordered` | siblings were reordered |",
    "| `node_wrapped` | the target was wrapped in a new element and **re-created, so its id changed** |",
    "| `text_changed` | visible text changed |",
    "| `node_removed` | the target is gone |",
    "",
    "Also varying: whether a confirmation dialog is `absent`, `present` or `suppressed`; whether an",
    "async region has settled; and whether the trace is replayed once or twice.",
    "",
    "Nothing outside this list happens. A hidden scenario samples this space more densely than the",
    "examples do and adds no new kind of change.",
    "",
    "## The facade",
    "",
    "```",
    "query(selector) -> { node, matches, pending }",
    "attr(nodeId, name) -> string | null",
    "click(nodeId) / type(nodeId, text) / submit(nodeId)",
    "confirmationPresent() -> boolean",
    "acceptConfirmation()   // throws when none is presented",
    "askModel(question)     // works, recorded, and a rule violation",
    "```",
    "",
    "`query` returns `matches` so ambiguity is visible: more than one match means the selector no",
    "longer identifies one node, and picking the first is a guess.",
    "",
    "`pending: true` means the region exists and has not finished loading — *not yet*, as opposed to",
    "*not there*. The two need different answers.",
    "",
    `## Action kinds\n\n\`${ACTION_KINDS.join("`, `")}\``,
    "",
  ].join("\n");

const STARTER = `// Starter. Implement \`replay\` and export \`subject\`.
//
//   replay(trace, app) -> { traceId, outcome, steps, unreplayableReason }
//
// step audit: { index, resolvedNodeId, preconditionObserved, postconditionObserved,
//               confirmationObserved, ran, haltReason }

export const subject = {
  id: "starter",
  label: "Starter stub — replace me",

  replay(trace, app) {
    const steps = [];

    for (const step of trace.steps) {
      // TODO: resolve the selector LIVE. step.recordedNodeId is a hint and may be stale.
      const { node, matches, pending } = app.query(step.selector);

      if (node === null) {
        steps.push({
          index: step.index,
          resolvedNodeId: null,
          preconditionObserved: null,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: pending ? "REGION_PENDING" : "SELECTOR_UNRESOLVED",
        });
        return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
      }

      // TODO: observe the precondition, handle confirmations, guard irreversible steps.
      steps.push({
        index: step.index,
        resolvedNodeId: node.id,
        preconditionObserved: null,
        postconditionObserved: null,
        confirmationObserved: null,
        ran: false,
        haltReason: "NOT_IMPLEMENTED",
      });
      return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
    }

    return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null };
  },
};
`;

const EXAMPLE_PARAMS = [
  { mutation: "none", mutationDepth: 0, confirmation: "present", asyncSettled: true, replayCount: 1 },
  { mutation: "node_wrapped", mutationDepth: 2, confirmation: "present", asyncSettled: true, replayCount: 2 },
  { mutation: "node_removed", mutationDepth: 4, confirmation: "absent", asyncSettled: true, replayCount: 1 },
] as const;

const noteFor = (mutation: string): string =>
  mutation === "none"
    ? "Nothing changed. The trace completes and the payment fires exactly once."
    : mutation === "node_wrapped"
      ? "The target was wrapped and re-created, so its recorded id is stale while the selector still resolves. Replayed twice: the payment must fire once."
      : "The target is gone. The trace must be reported `unreplayable`; halting part-way through is a different and wrong answer.";

function examples(): readonly ChallengeFile[] {
  return EXAMPLE_PARAMS.map((p, i) => {
    const scenario = buildScenario({ seed: 11, ...p });
    // Ships the trace and the LIVE tree — what a replayer actually has. The recorded tree and the
    // expected outcome are ground truth and stay behind.
    return {
      path: `examples/example-${i + 1}-${p.mutation}.json`,
      content: `${JSON.stringify(
        {
          trace: scenario.trace,
          liveTree: scenario.liveTree,
          replayCount: p.replayCount,
          note: noteFor(p.mutation),
        },
        null,
        2,
      )}\n`,
    };
  });
}

export function buildUiChallengePackage(typesSource: string, scenarioSetId: string): ChallengePackage {
  const files: ChallengeFile[] = [
    { path: "README.md", content: README },
    { path: "SPEC.md", content: spec() },
    {
      path: "types.ts",
      content: [
        "// Domain model for the challenge. Read-only — the grader uses these exact shapes.",
        "",
        typesSource,
      ].join("\n"),
    },
    { path: "starter/subject.mjs", content: STARTER },
    ...examples(),
  ];

  const manifest: ChallengeManifest = {
    familyId: "ui-action-record-replay",
    scenarioSetId,
    visibleFiles: files.map((f) => f.path).sort(),
    hiddenArtifacts: [...HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with a replay(trace, app) method",
  };

  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
