// The agent-facing package for the live-DOM replay descendant.
//
// The package split is stricter than the parent UI family. The visible surface publishes the full
// replay contract and a few worked traces, but never ships the app reducer, scenario parameters,
// verifier, reference, mutants, measured set, answer matrix, or generated reports.

import { buildScenario } from "../families/ui-replay-live-dom/scenarios.js";
import { SPEC_MD } from "../families/ui-replay-live-dom/spec.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const LIVE_DOM_HIDDEN_ARTIFACTS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "app.ts",
  "truth.ts",
  "invariants.ts",
  "matrix.json",
  "scenarios.json",
  "answer-matrix.json",
  "reports/",
] as const;

const README = `# Challenge: live-DOM action replay

## The problem

You are given a recorded UI action trace and a live DOM-like application facade. The live tree may
change while the trace is being replayed: nodes can re-mount, disable and re-enable, move under a
different structural path, inherit a stale test id, or be replaced by a different entity with the
same visible label.

Build a deterministic replay subject. It must complete replay when the visible live state still
names the recorded object, halt when the page may become actionable later, and report unreplayable
when the trace can never refer to the recorded object again.

## What you are given

| file | what it is |
|---|---|
| \`SPEC.md\` | the normative fairness contract and facade semantics |
| \`types.ts\` | the domain model the grader uses |
| \`starter/subject.mjs\` | a stub with the required export shape |
| \`examples/\` | visible examples showing the trace and initial live tree shape |

## What you must produce

A single ES module at \`submission/subject.mjs\`:

\`\`\`js
export const subject = {
  id: "my-implementation",
  label: "...",
  replay(trace, app) {
    return { traceId, outcome, steps, unreplayableReason, pendingEffects };
  },
};
\`\`\`

The grader may call \`replay\` twice with the same trace. The tree is fresh on the second call, but
the side-effect ledger is not. Your subject must keep its own completion record for irreversible
steps.

## How you are graded

Hidden scenarios are sampled from the state space declared in \`SPEC.md\`; they add no hidden rules.
The verifier is not shipped. It checks the sealed effect ledger, the sealed facade-call ledger, and
your returned audit.

Refusing everything fails. Replaying by one globally preferred address type fails. Calling
\`app.askModel\` fails even if the flow completes.
`;

const STARTER = `// Starter. Implement \`replay\` and export \`subject\`.
//
// Contract:
//   replay(trace, app) -> { traceId, outcome, steps, unreplayableReason, pendingEffects }
//
// The facade is documented in SPEC.md. Do not call app.askModel during replay.

const completed = new Set();

const blank = (step) => ({
  index: step.index,
  resolvedNodeId: null,
  resolvedVia: null,
  resolvedTick: null,
  preconditionObserved: null,
  entityObserved: null,
  postconditionObserved: null,
  confirmationNodeId: null,
  ran: false,
  haltReason: null,
});

export const subject = {
  id: "starter",
  label: "Starter stub — replace me",

  replay(trace, app) {
    const steps = [];
    const pendingEffects = [];

    for (const step of trace.steps) {
      if (step.irreversible && completed.has(step.index)) {
        steps.push({ ...blank(step), preconditionObserved: "already-completed" });
        continue;
      }

      const q = app.query(step.selector);
      if (q.node === null) {
        const region = app.regionState(step.anchor.region);
        steps.push({
          ...blank(step),
          resolvedTick: q.tick,
          haltReason: region.present ? "SELECTOR_UNRESOLVED" : "REGION_REMOVED",
        });
        return {
          traceId: trace.id,
          outcome: region.present ? "halted" : "unreplayable",
          steps,
          unreplayableReason: region.present ? null : "REGION_REMOVED",
          pendingEffects,
        };
      }

      const pre = app.attr(q.node.id, step.precondition.attr);
      steps.push({
        ...blank(step),
        resolvedNodeId: q.node.id,
        resolvedVia: "primary",
        resolvedTick: q.tick,
        preconditionObserved: pre,
        entityObserved: q.node.attrs["data-entity"] ?? null,
        haltReason: "NOT_IMPLEMENTED",
      });
      return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null, pendingEffects };
    }

    return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null, pendingEffects };
  },
};
`;

const EXAMPLE_PARAMS = [
  {
    label: "stable-completes",
    params: {
      seed: 11,
      regionFate: "stable",
      priorState: "clean",
      settleBudget: 2,
      anchorFidelity: "exact",
      anchorConflict: "none",
      busyFidelity: "honest",
      replayCount: 1,
    },
    note: "No mismatch is introduced; a conforming replay completes the trace.",
  },
  {
    label: "removed-region",
    params: {
      seed: 11,
      regionFate: "removed",
      priorState: "clean",
      settleBudget: 2,
      anchorFidelity: "exact",
      anchorConflict: "none",
      busyFidelity: "misleading",
      replayCount: 1,
    },
    note: "The target region is permanently torn down after an earlier step; waiting is the wrong operator instruction.",
  },
  {
    label: "late-mount",
    params: {
      seed: 11,
      regionFate: "late_mount",
      priorState: "clean",
      settleBudget: 6,
      anchorFidelity: "exact",
      anchorConflict: "none",
      busyFidelity: "honest",
      replayCount: 1,
    },
    note: "The target is absent briefly but the region is still present; a conforming replay can spend settle budget.",
  },
  {
    label: "address-conflict",
    params: {
      seed: 41,
      regionFate: "stable",
      priorState: "clean",
      settleBudget: 2,
      anchorFidelity: "exact",
      anchorConflict: "semantic_wins",
      busyFidelity: "honest",
      replayCount: 2,
    },
    note: "The recorded test id, semantic anchor, and structural path can resolve to different live nodes. Use visible entity/effect/precondition facts rather than a global address priority.",
  },
] as const;

function typeSurface(typesSource: string): string {
  const start = typesSource.indexOf("export interface UiNode");
  const publicPart = start >= 0 ? typesSource.slice(start) : typesSource;
  return [
    "// Domain model for the challenge. Read-only — the grader uses these shapes.",
    "// Implementation-side filenames, scenario parameters and answer keys are deliberately absent.",
    "",
    publicPart,
  ].join("\n");
}

function examples(): readonly ChallengeFile[] {
  return EXAMPLE_PARAMS.map((entry, i) => {
    const scenario = buildScenario(entry.params);
    return {
      path: `examples/example-${i + 1}-${entry.label}.json`,
      content: `${JSON.stringify(
        {
          trace: scenario.trace,
          initialTree: scenario.initialTree,
          replayCount: scenario.params.replayCount,
          note: entry.note,
        },
        null,
        2,
      )}\n`,
    };
  });
}

export function buildLiveDomChallengePackage(typesSource: string, scenarioSetId: string): ChallengePackage {
  const files: ChallengeFile[] = [
    { path: "README.md", content: README },
    { path: "SPEC.md", content: SPEC_MD },
    { path: "types.ts", content: typeSurface(typesSource) },
    { path: "starter/subject.mjs", content: STARTER },
    ...examples(),
  ];

  const manifest: ChallengeManifest = {
    familyId: "ui-replay-live-dom",
    scenarioSetId,
    visibleFiles: files.map((f) => f.path).sort(),
    hiddenArtifacts: [...LIVE_DOM_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with a replay(trace, app) method",
  };

  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
