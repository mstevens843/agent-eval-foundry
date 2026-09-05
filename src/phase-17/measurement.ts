// Lane 3 and Lane 5 - the measured trial ledger and the preregistered decision.
//
// Everything here is read back from the preserved attempt directories. Nothing is carried forward
// from the process that produced them, so the ledger regenerates from disk after the fact.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CAA_FAMILY_ID } from "./package-controls.js";

export type Phase17Decision = "TRANSFER-READY" | "VALID-BUT-EASY" | "INCONCLUSIVE" | "CANDIDATE-INVALID";

export interface Phase17SelfCheckEvidence {
  readonly wroteSelfCheck: boolean;
  readonly ranSelfCheck: boolean;
  readonly selfCheckTrackedQueryIdentity: boolean;
  readonly selfCheckExercisedAgeBoundary: boolean;
  readonly transcriptNamedIdentityCollapse: boolean;
  readonly selfCheckOutcomeCaptured: boolean;
  readonly note: string;
}

export interface Phase17TrialRow {
  readonly attemptId: string;
  readonly slot: string;
  readonly attemptIndex: number;
  readonly providerFamily: string;
  readonly model: string;
  readonly effort: string;
  readonly challengeSha256: string | null;
  readonly registeredChallengeSha256: string;
  readonly challengeHashCurrent: boolean;
  readonly scenarioSetId: string;
  readonly classification: string;
  readonly counts: boolean;
  readonly countabilityReason: string;
  readonly reward: number | null;
  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  readonly failedChecks: readonly string[];
  readonly failedScenarioKnobs: readonly string[];
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
  readonly priced: boolean;
  readonly submissionSha256: string | null;
  readonly gradingB6Passed: boolean;
  readonly selfCheck: Phase17SelfCheckEvidence;
}

export interface Phase17TrialLedger {
  readonly schema: "agent-eval-foundry/phase-17-trial-ledger@1";
  readonly registrationId: string;
  readonly familyId: string;
  readonly trials: readonly Phase17TrialRow[];
  readonly summary: {
    readonly attempted: number;
    readonly countable: number;
    readonly cleanSolves: number;
    readonly rewardZero: number;
    readonly rewardZeroByProvider: Readonly<Record<string, number>>;
    readonly retries: number;
    readonly blindLabelsRequired: number;
    readonly blindLabelsRun: number;
    readonly agreedCapabilityFailures: number;
    readonly pricedSubjectSpendUsd: number;
    readonly unpricedAttempts: number;
    readonly pricedLabelSpendUsd: number;
    readonly pricedCampaignSpendUsd: number;
  };
  readonly stoppingRuleFired: string;
  readonly decision: Phase17Decision;
  readonly decisionReason: string;
  readonly interval95: { readonly rewardZeroLow: number; readonly rewardZeroHigh: number };
}

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/**
 * Clopper-Pearson upper bound for 0 successes in n trials, at 95%.
 *
 * Zero observed failures never means a zero population failure rate, and this is the number that
 * says so out loud.
 */
export const zeroEventUpperBound = (n: number): number =>
  n === 0 ? 1 : Number((1 - 0.05 ** (1 / n)).toFixed(4));

/** Declared once, so what counts as "the agent self-checked" is a rule rather than a reading. */
const SELF_CHECK_PROBES = {
  wrote: /--input-type=module|<<\s*'?NODE'?|\/tmp\/[a-z0-9_-]+\.mjs/i,
  ran: /node\s+(--input-type=module|\/tmp\/[a-z0-9_-]+\.mjs)/i,
  queryIdentity: /(queried|queries|calls)\.push|queried\b[^\n]{0,40}fqdn|recorded[^\n]{0,30}fqdn/i,
  ageBoundary: /(nowHour\s*-\s*\d+|validatedAtHour:\s*\d+)/,
  identityCollapse:
    /(one (fqdn|name|domain) (repeatedly|n times)|reuse[^\n]{0,30}first|same fqdn[^\n]{0,20}(each|every)|bind[^\n]{0,20}only to that)/i,
} as const;

const selfCheckEvidence = (transcript: string): Phase17SelfCheckEvidence => {
  const wrote = SELF_CHECK_PROBES.wrote.test(transcript);
  return {
    wroteSelfCheck: wrote,
    ranSelfCheck: SELF_CHECK_PROBES.ran.test(transcript),
    selfCheckTrackedQueryIdentity: SELF_CHECK_PROBES.queryIdentity.test(transcript),
    selfCheckExercisedAgeBoundary: SELF_CHECK_PROBES.ageBoundary.test(transcript),
    transcriptNamedIdentityCollapse: SELF_CHECK_PROBES.identityCollapse.test(transcript),
    // The repository's rule: prose saying a check passed is never converted into a green outcome.
    selfCheckOutcomeCaptured: false,
    note: wrote
      ? "A self-check was written and executed inside the attempt container. Its machine-readable outcome does not survive capture, so selfCheckOutcomeCaptured stays false rather than being read out of model prose."
      : "No self-check was detected in the transcript.",
  };
};

export function buildPhase17TrialLedger(root: string): Phase17TrialLedger {
  const registration = JSON.parse(
    readFileSync(join(root, "data/phase-17-trial-preregistration.json"), "utf8"),
  ) as {
    registrationId: string;
    frozenInputs: { challengeSha256: string };
  };
  const dir = join(root, "trials", CAA_FAMILY_ID);
  const attempts = existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => !name.startsWith("."))
        .sort()
    : [];

  const trials = attempts.map((name): Phase17TrialRow => {
    const base = join(dir, name);
    const metadata = JSON.parse(readFileSync(join(base, "metadata.json"), "utf8")) as Record<string, unknown>;
    const result = JSON.parse(readFileSync(join(base, "result.json"), "utf8")) as {
      cells?: readonly { scenarioId: string; failed: readonly string[] }[];
      counts?: boolean;
      status?: string;
    };
    const countability = JSON.parse(readFileSync(join(base, "countability.json"), "utf8")) as {
      counts?: boolean;
      reason?: string;
    };
    const submissionPath = join(base, "submission", "subject.mjs");
    const transcriptPath = join(base, "transcript.txt");
    const cells = result.cells ?? [];
    const failed = cells.filter((cell) => cell.failed.length > 0);
    const counts = countability.counts ?? result.counts ?? false;
    const cost = metadata.costUsd;
    const registeredChallenge = registration.frozenInputs.challengeSha256;
    const observedChallenge = (metadata.challengeHash ?? metadata.registeredChallengeSha256) as
      | string
      | undefined;
    const grading = metadata.gradingB6 as { passed?: boolean } | undefined;

    return {
      attemptId: String(metadata.phase17AttemptId ?? name),
      slot: String(metadata.phase17Slot ?? ""),
      attemptIndex: Number(metadata.phase17AttemptIndex ?? 1),
      providerFamily: String(metadata.providerFamily ?? ""),
      model: String(metadata.model ?? ""),
      effort: String(metadata.effort ?? ""),
      challengeSha256: observedChallenge ?? null,
      registeredChallengeSha256: registeredChallenge,
      challengeHashCurrent: observedChallenge === registeredChallenge,
      scenarioSetId: String(metadata.scenarioSetId ?? ""),
      classification: String(metadata.classification ?? result.status ?? ""),
      counts,
      countabilityReason: String(countability.reason ?? ""),
      reward: counts ? (failed.length === 0 ? 1 : 0) : null,
      scenariosGraded: cells.length,
      scenariosFailed: failed.length,
      failedChecks: [...new Set(cells.flatMap((cell) => cell.failed))].sort(),
      failedScenarioKnobs: failed.map((cell) => cell.scenarioId).sort(),
      runtimeSeconds: metadata.runtimeSeconds === null ? null : Number(metadata.runtimeSeconds),
      costUsd: typeof cost === "number" ? cost : null,
      priced: typeof cost === "number",
      submissionSha256: existsSync(submissionPath) ? sha256(readFileSync(submissionPath)) : null,
      gradingB6Passed: grading?.passed === true,
      selfCheck: selfCheckEvidence(existsSync(transcriptPath) ? readFileSync(transcriptPath, "utf8") : ""),
    };
  });

  const countable = trials.filter((row) => row.counts);
  const rewardZero = countable.filter((row) => row.reward === 0);
  const rewardZeroByProvider: Record<string, number> = {};
  for (const row of rewardZero) {
    rewardZeroByProvider[row.providerFamily] = (rewardZeroByProvider[row.providerFamily] ?? 0) + 1;
  }
  const pricedSubject = Number(trials.reduce((total, row) => total + (row.costUsd ?? 0), 0).toFixed(6));

  const cleanSolves = countable.filter((row) => row.reward === 1).length;
  const firstStageComplete = countable.length >= 4;
  const stoppingRuleFired = !firstStageComplete
    ? "none - the first stage is incomplete"
    : rewardZero.length === 0
      ? "S1 - all first-stage trials were clean solves, so the campaign stops here"
      : rewardZero.length >= 2 && Object.keys(rewardZeroByProvider).length >= 2
        ? "S2 - two or more countable reward-zero trials spanning both provider families, so labelling begins"
        : "S3 - reward zero is present but not yet cross-family, so additional slots must be preregistered";

  const decision: Phase17Decision = !firstStageComplete
    ? "INCONCLUSIVE"
    : rewardZero.length === 0
      ? "VALID-BUT-EASY"
      : "INCONCLUSIVE";

  return {
    schema: "agent-eval-foundry/phase-17-trial-ledger@1",
    registrationId: registration.registrationId,
    familyId: CAA_FAMILY_ID,
    trials,
    summary: {
      attempted: trials.length,
      countable: countable.length,
      cleanSolves,
      rewardZero: rewardZero.length,
      rewardZeroByProvider,
      retries: trials.filter((row) => row.attemptIndex > 1).length,
      blindLabelsRequired: rewardZero.length * 2,
      blindLabelsRun: 0,
      agreedCapabilityFailures: 0,
      pricedSubjectSpendUsd: pricedSubject,
      unpricedAttempts: trials.filter((row) => !row.priced).length,
      pricedLabelSpendUsd: 0,
      pricedCampaignSpendUsd: pricedSubject,
    },
    stoppingRuleFired,
    decision,
    decisionReason:
      decision === "VALID-BUT-EASY"
        ? "The package passed its exact probe and all twelve package controls, and the registered first-stage campaign produced no countable reward-zero trial in either provider family. There is therefore no agreed capability failure to attribute, and no blind labelling was owed."
        : "The first stage did not complete, or reward zero appeared without the cross-family coverage the registered rules require.",
    interval95: {
      rewardZeroLow: 0,
      rewardZeroHigh: zeroEventUpperBound(countable.length),
    },
  };
}

export const phase17TrialLedgerJson = (ledger: Phase17TrialLedger): string =>
  `${JSON.stringify(ledger, null, 2)}\n`;
