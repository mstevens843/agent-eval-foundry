import { SPEC_MD } from "../families/deployment-rollback-recompute/spec.js";
import { buildScenario } from "../families/deployment-rollback-recompute/truth.js";
import type { ScenarioParams } from "../families/deployment-rollback-recompute/truth.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const DEPLOYMENT_ROLLBACK_HIDDEN_ARTIFACTS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "truth.ts",
  "matrix.json",
  "answer-matrix.json",
  "reports/",
] as const;

const README = `# Challenge: deployment rollback recovery

## The problem

A controller compensation may complete immediately before its response is lost. A later controller
must recover the already-authorized rollback safely after authority changes. Implement recovery from
the durable rollback intent and the idempotent deployment-controller facade.

## What you are given

| file | what it is |
|---|---|
| \`SPEC.md\` | the complete normative rules and hidden-scenario dimensions |
| \`types.ts\` | the public subject and controller interfaces |
| \`starter/subject.mjs\` | a deliberately incorrect authority-epoch implementation |
| \`examples/\` | visible examples of the public recovery view |

## What you must produce

Write \`submission/subject.mjs\` exporting \`subject.run(view, controller)\`. Do not modify
\`challenge/\`.

## How you are graded

The grader owns the controller call and effect ledgers. It checks that the committed rollback key is
recovered, retries collectively create one compensation, valid work completes, and reports match
calls. Every intent is already authorized; no private cloud or rollback-decision policy is graded.
`;

const STARTER = `// Deliberately wrong after controller authority changes.
// Read SPEC.md, then recover the committed key from the durable rollback intent.

export const subject = {
  id: "starter",
  label: "Current-authority rollback-key recomputation starter",
  run(view, controller) {
    // WRONG: authorityEpoch changes when another controller recovers the rollback.
    const idempotencyKey =
      \`rollback::\${view.intent.rollbackIntentId}::\${view.intent.releaseId}::authority-\${view.authorityEpoch}\`;
    const receipt = controller.compensate(view.intent.rollbackIntentId, {
      idempotencyKey,
      releaseId: view.intent.releaseId,
      regionId: view.intent.regionId,
      compensation: view.intent.compensation,
    });
    return {
      rollbackIntentId: view.intent.rollbackIntentId,
      controllerId: view.controllerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey,
      outcome: "compensated",
      controllerApplied: receipt.applied,
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
    label: "single-controller",
    params: { seed: 41, nControllers: 1, effects: 4, crashPosition: "after_compensation" },
    note: "No replacement controller arrives, so the committed authority-0 key is used once.",
  },
  {
    label: "authority-transfer",
    params: { seed: 11, nControllers: 2, effects: 4, crashPosition: "after_compensation" },
    note: "The second controller sees epoch 11 and must recover the committed authority-0 key.",
  },
  {
    label: "clean-compensation",
    params: { seed: 23, nControllers: 4, effects: 12, crashPosition: "none" },
    note: "Without an uncertain completed compensation, only the first invocation is made.",
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

export function buildDeploymentRollbackChallengePackage(
  typesSource: string,
  scenarioSetId: string,
): ChallengePackage {
  const files: ChallengeFile[] = [
    { path: "README.md", content: README },
    { path: "SPEC.md", content: SPEC_MD },
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
    familyId: "deployment-rollback-recompute",
    scenarioSetId,
    visibleFiles: files.map((file) => file.path).sort(),
    hiddenArtifacts: [...DEPLOYMENT_ROLLBACK_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with run(view, controller)",
  };
  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
