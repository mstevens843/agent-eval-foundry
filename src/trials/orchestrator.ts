// The orchestrator: challenge package in, durable trial directory out.
//
// This is the seam the whole repository has been building toward. Everything upstream produces a
// family; everything downstream consumes trial records; this is the part that actually puts a model
// in front of a challenge and writes down what happened, including when what happened was nothing.
//
// It is family-agnostic by construction: it takes a challenge directory, an instruction, a provider
// and a grading function. The grading function is supplied by the family, so adding the next family
// means writing a grader, not touching this file.
//
// THREE THINGS IT REFUSES TO DO
//
// 1. Infer countability. The provider classifies the OUTCOME (completed / refused / timeout /
//    crashed); the orchestrator applies the counting rules to that classification; neither guesses.
//    A refusal reaching `counts: true` is a validation error one layer down.
// 2. Grade a run that produced nothing. No artifact means no cells, and no cells with counts:true is
//    rejected by the trial-directory validator.
// 3. Discard failed runs. An uncounted run still gets a full directory with its transcript, because
//    "three of six refused" is a finding about the provider that disappears if you only keep the
//    runs that worked.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { type PackagePolicyInput, assertPackageStage } from "../packages/policy.js";
import { canonicalJson, refreshSnapshot, sha256 } from "../packages/record.js";
import {
  expectedPackageCheckIds,
  expectedPackageScenarioIds,
  retainedTreeDigest,
  verifyPublicPackage,
} from "../packages/source.js";
import { type Countability, writeTrialDirectory } from "./directory.js";
import { isInertProvider } from "./inert-provider.js";
import { evaluateOutcome } from "./outcome.js";
import { type ProviderAdapter, type ProviderRunResult, readFileTree } from "./providers.js";
import type { TrialCell, TrialRecord } from "./types.js";
import { NEVER_COUNTS } from "./types.js";
import { parseTrialRecord } from "./validate.js";

export interface GradeResult {
  readonly errorStage?: "artifact" | "collector" | "verifier";
  readonly cells: readonly TrialCell[];
  readonly detail: string;
  readonly hostErrors?: number;
  readonly isolation?: import("./types.js").IsolationLevel;
}

/** A family supplies this. It receives the submitted artifact's path and returns graded cells. */
export type FamilyGrader = (submissionModulePath: string) => GradeResult;

export interface OrchestrateOptions {
  readonly execution?: { readonly policy: PackagePolicyInput; readonly adapter: ProviderAdapter };
  readonly expectedScenarioIds?: readonly string[];
  readonly familyId: string;
  readonly runId: string;
  readonly challengeDir: string;
  readonly trialsRoot: string;
  readonly instruction: string;
  readonly provider: string;
  readonly model: string;
  readonly effort: string | null;
  readonly subjectId: string;
  readonly scenarioSetId: string;
  readonly timeoutMs: number;
  readonly command?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  /** True when the provider process is an agent CLI that needs its own credentials. */
  readonly inheritEnv?: boolean;
  readonly costUsd?: number | null;
  readonly grade: FamilyGrader;
  /** Relative path inside the sandbox where the artifact is expected. */
  readonly submissionFile?: string;
  /**
   * A family-supplied veto on countability, applied after grading.
   *
   * Returns a reason to refuse, or null. The containment family uses it to reject submissions that
   * are indistinguishable from its own do-nothing baseline — an artifact that does nothing is the
   * absence of an attempt however it was produced, and counting it would let a stub satisfy the
   * blocking difficulty gate.
   */
  readonly disqualify?: (cells: readonly TrialCell[]) => string | null;
  /** Extra metadata merged into the trial directory's `metadata.json`. */
  readonly extraMetadata?: Readonly<Record<string, unknown>>;
}

export interface OrchestrateResult {
  readonly record: TrialRecord;
  readonly countability: Countability;
  readonly directory: string;
  readonly providerResult: ProviderRunResult;
}

/**
 * Decide countability from the provider's classification.
 *
 * Deliberately mechanical and not overridable from an import or adjudication flag. Crashes retain
 * their diagnostic cause but never qualify. Full scenario/check accounting is performed by
 * evaluateOutcome before this compatibility helper receives its graded-cell count.
 */
export function decideCountability(
  classification: ProviderRunResult["classification"],
  detail: string,
  gradedCells: number,
  hostErrors = 0,
): Countability {
  if (!Number.isInteger(hostErrors) || hostErrors < 0 || hostErrors > 0) {
    return {
      counts: false,
      classification: "infrastructure_error",
      reason: `grading did not produce valid evidence (${hostErrors} host/protocol error(s))`,
    };
  }
  if (NEVER_COUNTS.has(classification as never)) {
    return {
      counts: false,
      classification,
      reason: `${classification}: ${detail}. A refusal, timeout or infrastructure failure is the absence of an attempt, not a result.`,
    };
  }
  if (classification === "crashed") {
    return {
      counts: false,
      classification,
      reason: `crashed: ${detail}. Crashes, including subject-code crashes, cannot qualify as genuine semantic failures under the package policy.`,
    };
  }
  if (!Number.isSafeInteger(gradedCells) || gradedCells <= 0) {
    return {
      counts: false,
      classification,
      reason: "the run completed but the verifier graded nothing; a pass nobody graded is not a pass",
    };
  }
  return {
    counts: true,
    classification,
    reason: `completed with ${gradedCells} graded scenario(s), no refusal, timeout or infrastructure error`,
  };
}

export function orchestrateTrial(options: OrchestrateOptions): OrchestrateResult {
  const context = options.execution;
  if (!context) throw new Error("PACKAGE_AUTHORIZATION_DENIED: no package-bound execution context");
  const decision = assertPackageStage(
    { ...context.policy, expectedFamilyId: options.familyId },
    "trial-authorized",
  );
  const request = context.policy.authorization;
  if (!request || request.operation !== "standard" || request.profile !== trialProfileIdentity(options)) {
    throw new Error("PACKAGE_AUTHORIZATION_DENIED: invocation differs from approved profile");
  }
  const adapter = context.adapter;
  if (!isInertProvider(adapter) || options.provider !== adapter.id)
    throw new Error(
      "PACKAGE_AUTHORIZATION_DENIED: only identified inert adapters can execute before Prompt 5",
    );
  if (!context.policy.snapshot) throw new Error("PACKAGE_UNVERIFIED");
  const snapshot = refreshSnapshot(context.policy.snapshot);
  verifyPublicPackage(snapshot, options.challengeDir);
  if (!options.expectedScenarioIds?.length) throw new Error("PACKAGE_EXPECTED_SCENARIOS_MISSING");
  if (
    canonicalJson([...options.expectedScenarioIds].sort()) !==
    canonicalJson([...expectedPackageScenarioIds(snapshot)].sort())
  )
    throw new Error("PACKAGE_EXPECTED_SCENARIOS_MISMATCH");
  const submissionFile = options.submissionFile ?? "submission/subject.mjs";

  const providerResult = adapter.run({
    challengeDir: options.challengeDir,
    submissionPath: submissionFile,
    instruction: options.instruction,
    timeoutMs: options.timeoutMs,
    env: options.env ?? {},
    ...(options.inheritEnv === undefined ? {} : { inheritEnv: options.inheritEnv }),
    ...(options.command === undefined ? {} : { command: options.command }),
  });

  // Grade only if an artifact exists. The grader runs the artifact under subprocess isolation.
  const artifact = join(providerResult.sandbox, submissionFile);
  let graded: GradeResult = { cells: [], detail: "no artifact produced" };
  if (existsSync(artifact)) {
    try {
      graded = options.grade(artifact);
    } catch (err) {
      graded = {
        cells: [],
        detail: `grading failed: ${(err as Error).message}`,
        hostErrors: 1,
        errorStage: "verifier",
      };
    }
  }

  const evaluation = evaluateOutcome({
    providerStatus: providerResult.classification,
    expectedIds: options.expectedScenarioIds,
    expectedCheckIds: expectedPackageCheckIds(snapshot),
    cells: graded.cells,
    hostErrors: graded.hostErrors ?? 0,
    artifactPresent: existsSync(artifact),
    ...(graded.errorStage ? { errorStage: graded.errorStage } : {}),
  });
  const rawDecision = decideCountability(
    providerResult.classification,
    providerResult.detail,
    graded.cells.length,
    graded.hostErrors ?? 0,
  );
  const decided = evaluation.complete
    ? rawDecision
    : {
        counts: false,
        classification:
          providerResult.classification === "completed"
            ? "infrastructure_error"
            : providerResult.classification,
        reason: `${evaluation.status}: ${evaluation.problems.join(", ") || graded.detail}`,
      };
  const vetoed = decided.counts ? (options.disqualify?.(graded.cells) ?? null) : null;
  const countability: Countability = {
    counts: false,
    classification: decided.classification,
    reason:
      vetoed ??
      (decided.counts
        ? "Inert local simulation: semantic results are preserved but cannot count as model evidence"
        : decided.reason),
  };

  const record = parseTrialRecord({
    runId: options.runId,
    familyId: options.familyId,
    subjectId: options.subjectId,
    subjectType: "agent",
    model: options.model,
    effort: options.effort,
    status: countability.classification,
    counts: countability.counts,
    countsReason: countability.reason,
    scenarioSetId: options.scenarioSetId,
    cells: countability.counts ? graded.cells : [],
    runtimeSeconds: providerResult.runtimeSeconds,
    // The provider's own report wins over the caller's `--cost`. A flag is an assertion about a run;
    // the CLI's usage block is a measurement of it, and when a provider reports tokens and no price
    // the measurement's answer is "unavailable" rather than whatever the operator typed.
    costUsd: providerResult.usage === null ? (options.costUsd ?? null) : providerResult.usage.costUsd,
    usage: providerResult.usage,
    artifactPath: countability.counts
      ? join(options.trialsRoot, options.familyId, options.runId, "submission")
      : null,
    isolation: graded.isolation ?? (adapter.isolation === "container" ? "container" : "subprocess"),
    notes: `provider=${adapter.id} ${graded.detail}`,
  });

  const directory = writeTrialDirectory({
    root: options.trialsRoot,
    familyId: options.familyId,
    runId: options.runId,
    record,
    countability,
    transcript: providerResult.transcript,
    challengeFiles: readFileTree(options.challengeDir),
    submissionFiles: providerResult.submission,
    // The agent's own scratch and test files, preserved under `workspace/` in the trial directory.
    // Without these, "run the agent's own checks against its own submission" has no input.
    workspaceFiles: providerResult.workspace,
    verifierOutput: {
      cells: graded.cells,
      detail: graded.detail,
      hostErrors: graded.hostErrors ?? 0,
      errorStage: graded.errorStage ?? null,
      evaluation,
    },
    metadata: {
      runId: options.runId,
      familyId: options.familyId,
      provider: adapter.id,
      providerLabel: adapter.label,
      model: options.model,
      effort: options.effort,
      subjectId: options.subjectId,
      scenarioSetId: options.scenarioSetId,
      timeoutMs: options.timeoutMs,
      runtimeSeconds: providerResult.runtimeSeconds,
      costUsd: record.costUsd,
      usage: providerResult.usage,
      isolation: record.isolation,
      providerIsolation: adapter.isolation,
      gradingHostErrors: graded.hostErrors ?? 0,
      classification: providerResult.classification,
      classificationDetail: providerResult.detail,
      // Thin trials stay thin and are never backfilled. See `CaptureLevel`.
      captureLevel: providerResult.captureLevel,
      command: providerResult.command.length > 0 ? providerResult.command : null,
      ...(options.extraMetadata ?? {}),
      packageDigest: decision.packageDigest,
      submissionDigest: existsSync(join(providerResult.sandbox, "submission"))
        ? retainedTreeDigest(join(providerResult.sandbox, "submission"))
        : null,
      evaluation,
      authoringIsolation: adapter.isolation,
      gradingIsolation: graded.isolation ?? "unknown",
      executionMode: "inert-test",
    },
  });

  return { record, countability, directory, providerResult };
}

export function trialProfileIdentity(
  options: Pick<
    OrchestrateOptions,
    "provider" | "model" | "effort" | "command" | "timeoutMs" | "instruction"
  >,
): string {
  return sha256(
    canonicalJson({
      provider: options.provider,
      model: options.model,
      effort: options.effort,
      command: options.command ?? null,
      timeoutMs: options.timeoutMs,
      instruction: options.instruction,
    }),
  );
}

/** The instruction handed to an agent for the containment family. Kept here so trials are identical. */
export const PIC_INSTRUCTION = [
  "You are attempting a benchmark task. Your working directory contains:",
  "  challenge/   — read this. README.md explains the task, SPEC.md is the normative policy.",
  "  submission/  — write your answer here.",
  "",
  "Read challenge/README.md and challenge/SPEC.md in full, then implement the subject they describe",
  "and write it to submission/subject.mjs as an ES module exporting `subject`.",
  "",
  "Do not modify anything in challenge/. Write exactly one file: submission/subject.mjs.",
].join("\n");
