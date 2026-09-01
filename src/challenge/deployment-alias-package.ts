import { buildScenario } from "../families/deployment-model-alias-rollout-drift/scenarios.js";
import { SPEC_MD } from "../families/deployment-model-alias-rollout-drift/spec.js";
import type { ScenarioParams } from "../families/deployment-model-alias-rollout-drift/truth.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const DEPLOYMENT_ALIAS_HIDDEN_ARTIFACTS = [
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

const README = `# Challenge: deployment model-alias rollout drift

## The problem

You are building a deployment decision layer for model rollouts. A model alias can change underneath
a deployment or evaluation workflow. Cached alias maps, public eval summaries and provider status
strings can be stale or misleading.

Implement a deterministic subject that reconciles the current alias mapping, rollout ledger, eval
stream and baseline record before deciding whether to continue, rollback, quarantine or re-evaluate.
Record an audit trail explaining which current facts governed the decision.

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
  run(view, deployment) {
    return { decisions: [{ actionId, decision, reason, alias, concreteVersion, baselineVersion }], audit: [...] };
  },
};
\`\`\`

The grader may call \`run\` twice for the same request. The rollout state is rebuilt for each
attempt, but the effect ledger is shared. Duplicate irreversible decisions fail.

## How you are graded

Hidden scenarios sample the state space declared in \`SPEC.md\`; they add no hidden rules. The hidden
verifier compares your decisions and audit to verifier-owned alias, rollout, eval, baseline, facade
call and decision-effect ledgers. Cached snapshots and subject-owned claims may be stale or false.

Allowed assumptions: all hidden cases stay inside the declared space in \`SPEC.md\`, the deployment
facade methods are the only current truth source, and examples illustrate format rather than
exhaustive coverage.

Trusting alias names, cached mappings, public summaries or subject-owned model-health claims fails.
Refusing every rollout fails. Reporting a decision without the verifier-owned effect fails.
`;

const STARTER = `// Starter. Implement \`run\` and export \`subject\`.
//
// Contract:
//   run(view, deployment) -> { decisions: [{ actionId, decision, reason, alias, concreteVersion, baselineVersion }], audit: [...] }
//
// The deployment facade is the current source of truth. Cached alias maps and public summaries may
// be stale or false.

const completed = new Set();

const auditEvent = (seq, actionId, reason, alias, baseline, evals, detail) => ({
  seq,
  actionId,
  reason,
  observedAlias: alias?.alias ?? null,
  observedCurrentVersion: alias?.version ?? null,
  observedGeneration: alias?.generation ?? null,
  observedPhase: alias?.phase ?? null,
  observedCanaryWindow: alias?.canaryWindow ?? null,
  observedBaselineVersion: baseline?.version ?? null,
  observedEvalSampleIds: evals.map((sample) => sample.sampleId),
  observedEvalServedVersions: evals.map((sample) => sample.servedVersion),
  usedSubjectModelClaim: false,
  detail,
});

function decide(view, currentAlias, evals, baseline) {
  if (currentAlias === null) {
    return { decision: "quarantine", reason: "DMD1_CURRENT_ALIAS_REQUIRED", concreteVersion: null, baselineVersion: baseline?.version ?? null };
  }
  if (baseline === null || baseline.version !== view.request.requiredBaselineVersion) {
    return { decision: "quarantine", reason: "DMD3_BASELINE_MATCH_REQUIRED", concreteVersion: currentAlias.version, baselineVersion: baseline?.version ?? null };
  }
  if (currentAlias.canaryWindow === "closed" || currentAlias.phase === "pre_canary") {
    return {
      decision: view.request.reevaluationAvailable ? "re_evaluate" : "quarantine",
      reason: "DMD4_ROLLOUT_WINDOW_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }
  const currentSamples = evals.filter((sample) => sample.servedVersion === currentAlias.version && sample.inRolloutWindow);
  if (currentSamples.length < 2 || currentSamples.some((sample) => sample.scoreDelta === null)) {
    return {
      decision: view.request.reevaluationAvailable ? "re_evaluate" : "quarantine",
      reason: "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }
  const worstDelta = Math.max(...currentSamples.map((sample) => sample.scoreDelta ?? 0));
  if (worstDelta >= baseline.rollbackThreshold) {
    return { decision: "rollback", reason: "DMD5_ROLLBACK_REQUIRED", concreteVersion: currentAlias.version, baselineVersion: baseline.version };
  }
  return { decision: "continue", reason: "ALLOWED", concreteVersion: currentAlias.version, baselineVersion: baseline.version };
}

export const subject = {
  id: "starter",
  label: "Starter stub - replace me",

  run(view, deployment) {
    const currentAlias = deployment.currentAlias(view.request.alias);
    const rollout = deployment.rolloutLedger(view.request.alias);
    const evals = deployment.evalStream(view.request.alias);
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    const actionId = view.request.id;
    const audit = [
      auditEvent(1, actionId, "OBSERVED", currentAlias, baseline, evals, "observed current rollout state"),
    ];
    const decision = decide(view, currentAlias, evals, baseline);
    const completionKey = view.request.idempotencyKey;

    if (!completed.has(completionKey)) {
      deployment.applyRolloutDecision(actionId, {
        alias: view.request.alias,
        decision: decision.decision,
        concreteVersion: decision.concreteVersion,
        baselineVersion: decision.baselineVersion,
        idempotencyKey: view.request.idempotencyKey,
      });
      completed.add(completionKey);
    }

    audit.push(auditEvent(2, actionId, decision.reason, currentAlias, baseline, evals, "decision recorded"));
    return { decisions: [{ actionId, alias: view.request.alias, ...decision }], audit };
  },
};
`;

const EXAMPLE_PARAMS: readonly {
  readonly label: string;
  readonly params: ScenarioParams;
  readonly note: string;
}[] = [
  {
    label: "valid-continue",
    params: {
      seed: 11,
      alias: "prod-chat",
      currentVersionState: "successor",
      rolloutPhase: "ramp",
      cacheState: "fresh",
      canaryWindow: "open",
      regressionSeverity: "none",
      evalMix: "all_current",
      rollbackTiming: "none",
      baselineState: "correct_previous",
      providerDisagreement: "none",
      reevaluation: "unavailable",
      surface: "release_console",
      repeatCount: 1,
    },
    note: "Current concrete version has sufficient in-window evidence and should continue.",
  },
  {
    label: "major-regression-rollback",
    params: {
      seed: 23,
      alias: "eval-default",
      currentVersionState: "successor",
      rolloutPhase: "canary",
      cacheState: "stale_initial",
      canaryWindow: "open",
      regressionSeverity: "major",
      evalMix: "mixed_versions",
      rollbackTiming: "after_bad_eval",
      baselineState: "correct_previous",
      providerDisagreement: "provider_says_green",
      reevaluation: "available",
      surface: "ci_worker",
      repeatCount: 1,
    },
    note: "The public summary says green, but authoritative current-version eval samples require rollback.",
  },
  {
    label: "closed-window-reevaluate",
    params: {
      seed: 11,
      alias: "prod-chat",
      currentVersionState: "successor",
      rolloutPhase: "pre_canary",
      cacheState: "stale_previous",
      canaryWindow: "closed",
      regressionSeverity: "none",
      evalMix: "all_current",
      rollbackTiming: "none",
      baselineState: "wrong_current",
      providerDisagreement: "none",
      reevaluation: "available",
      surface: "routing_service",
      repeatCount: 1,
    },
    note: "Closed pre-canary evidence must not be used to continue or rollback.",
  },
  {
    label: "duplicate-attempt",
    params: {
      seed: 23,
      alias: "prod-chat",
      currentVersionState: "same",
      rolloutPhase: "complete",
      cacheState: "fresh",
      canaryWindow: "complete",
      regressionSeverity: "minor",
      evalMix: "all_current",
      rollbackTiming: "stale_request",
      baselineState: "correct_previous",
      providerDisagreement: "provider_says_red",
      reevaluation: "unavailable",
      surface: "release_console",
      repeatCount: 2,
    },
    note: "The same rollout request may be attempted twice, but the verifier-owned effect may fire once.",
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

export function buildDeploymentAliasChallengePackage(
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
    familyId: "deployment-model-alias-rollout-drift",
    scenarioSetId,
    visibleFiles: files.map((f) => f.path).sort(),
    hiddenArtifacts: [...DEPLOYMENT_ALIAS_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with run(view, deployment)",
  };

  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
