import { SPEC_MD } from "../families/dao-descendant/spec.js";
import { buildScenario } from "../families/dao-descendant/truth.js";
import type { ScenarioParams } from "../families/dao-descendant/truth.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const DAO_DESCENDANT_HIDDEN_ARTIFACTS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "truth.ts",
  "matrix.json",
  "answer-matrix.json",
  "reports/",
] as const;

const README = `# Challenge: durable outbox recovery

## The problem

An external call may complete immediately before a worker loses its lease. A replacement worker
must retry safely even though the current lease epoch is different. Implement recovery using the
durable intent and the idempotent tool facade.

## What you are given

| file | what it is |
|---|---|
| \`SPEC.md\` | the complete normative rules and hidden-scenario dimensions |
| \`types.ts\` | the public subject and tool interfaces |
| \`starter/subject.mjs\` | a deliberately incorrect current-epoch implementation |
| \`examples/\` | visible examples of the public recovery view |

## What you must produce

Write \`submission/subject.mjs\` exporting \`subject.run(view, tool)\`. Do not modify \`challenge/\`.

## How you are graded

The grader owns the call and external-effect ledgers. It checks that the committed key is recovered,
that retries collectively produce exactly one effect, that valid work completes, and that reports
match calls. Hidden cases sample only the dimensions declared in \`SPEC.md\`.
`;

const STARTER = `// Starter skeleton. It is deliberately wrong after reassignment.
// Read SPEC.md, then replace the recomputation with recovery from the durable intent.

export const subject = {
  id: "starter",
  label: "Current-epoch recomputation starter",
  run(view, tool) {
    // WRONG: leaseEpoch changes when another worker recovers the action.
    const idempotencyKey =
      \`idem::\${view.intent.actionId}::\${view.intent.requestId}::epoch-\${view.leaseEpoch}\`;
    const receipt = tool.execute(view.intent.actionId, {
      idempotencyKey,
      payload: view.intent.payload,
    });
    return {
      actionId: view.intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey,
      outcome: "executed",
      toolOk: receipt.ok,
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
    label: "single-worker",
    params: { seed: 41, nWorkers: 1, keys: 4, crashPosition: "after_tool" },
    note: "No replacement worker arrives, so the committed epoch-0 key is used once.",
  },
  {
    label: "reassigned",
    params: { seed: 11, nWorkers: 2, keys: 4, crashPosition: "after_tool" },
    note: "The second worker sees epoch 1 and must still recover the committed epoch-0 key.",
  },
  {
    label: "clean-call",
    params: { seed: 23, nWorkers: 4, keys: 12, crashPosition: "none" },
    note: "Without an uncertain post-call crash, only the first delivery is made.",
  },
];

const typesFor = (typesSource: string): string =>
  [
    "// Public domain model. Hidden truth, verifier, scenario selection and ledgers are absent.",
    "",
    typesSource,
  ].join("\n");

const examples = (): readonly ChallengeFile[] =>
  EXAMPLES.map((entry, index) => {
    const scenario = buildScenario(entry.params);
    return {
      path: `examples/example-${index + 1}-${entry.label}.json`,
      content: `${JSON.stringify({ views: scenario.views, note: entry.note }, null, 2)}\n`,
    };
  });

export function buildDaoDescendantChallengePackage(
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
    familyId: "dao-descendant",
    scenarioSetId,
    visibleFiles: files.map((file) => file.path).sort(),
    hiddenArtifacts: [...DAO_DESCENDANT_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with run(view, tool)",
  };
  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
