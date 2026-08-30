import { type RuleCode, fail, isRecord, num, optionalText, str, strNullable } from "../foundry/schema.js";
import {
  HUMAN_REVIEW_STATUSES,
  HUMAN_VERIFIER_STATUSES,
  type HumanAmbiguityFinding,
  type HumanHint,
  type HumanQuestion,
  type HumanReviewRecord,
  type HumanReviewStatus,
  type HumanValidationFailure,
  type HumanVerifierOutcome,
  type HumanVerifierStatus,
  SOLVER_RELATIONS,
  type SolverRelation,
} from "./types.js";

const bool = (v: unknown, path: string): boolean =>
  typeof v === "boolean" ? v : fail("E_TYPE", path, "expected a boolean");

const maybeNum = (v: unknown, path: string): number | null =>
  v === null || v === undefined ? null : num(v, path);

const arr = <T>(v: unknown, path: string, parse: (x: unknown, p: string) => T): readonly T[] =>
  Array.isArray(v) ? v.map((x, i) => parse(x, `${path}[${i}]`)) : fail("E_TYPE", path, "expected an array");

const strArr = (v: unknown, path: string): readonly string[] => arr(v, path, str);

function enumValue<const T extends readonly string[]>(v: unknown, path: string, values: T): T[number] {
  const s = str(v, path);
  return values.includes(s) ? s : fail("E_TYPE", path, `expected one of ${values.join(", ")}`);
}

function parseHint(v: unknown, path: string): HumanHint {
  if (!isRecord(v)) fail("E_SHAPE", path, "expected an object");
  return {
    source: str(v.source, `${path}.source`),
    text: optionalText(v.text, `${path}.text`),
    private: bool(v.private, `${path}.private`),
  };
}

function parseQuestion(v: unknown, path: string): HumanQuestion {
  if (!isRecord(v)) fail("E_SHAPE", path, "expected an object");
  return {
    askedAt: strNullable(v.askedAt, `${path}.askedAt`),
    question: str(v.question, `${path}.question`),
    answer: optionalText(v.answer, `${path}.answer`),
    answerSource: enumValue(v.answerSource, `${path}.answerSource`, [
      "public-package",
      "private-context",
      "not-answered",
    ] as const),
  };
}

function parseAmbiguity(v: unknown, path: string): HumanAmbiguityFinding {
  if (!isRecord(v)) fail("E_SHAPE", path, "expected an object");
  return {
    finding: str(v.finding, `${path}.finding`),
    status: enumValue(v.status, `${path}.status`, ["open", "resolved", "not-applicable"] as const),
    resolution: optionalText(v.resolution, `${path}.resolution`),
  };
}

function parseVerifier(v: unknown, path: string): HumanVerifierOutcome {
  if (!isRecord(v)) fail("E_SHAPE", path, "expected an object");
  return {
    status: enumValue(v.status, `${path}.status`, HUMAN_VERIFIER_STATUSES),
    command: strNullable(v.command, `${path}.command`),
    outputPath: strNullable(v.outputPath, `${path}.outputPath`),
    scenariosPassed: maybeNum(v.scenariosPassed, `${path}.scenariosPassed`),
    scenariosFailed: maybeNum(v.scenariosFailed, `${path}.scenariosFailed`),
  };
}

export function parseHumanReviewRecord(v: unknown, path: string): HumanReviewRecord {
  if (!isRecord(v)) fail("E_SHAPE", path, "expected an object");
  const solverRaw = v.solver;
  if (!isRecord(solverRaw)) fail("E_SHAPE", `${path}.solver`, "expected an object");
  return {
    reviewId: str(v.reviewId, `${path}.reviewId`),
    familyId: str(v.familyId, `${path}.familyId`),
    solver: {
      id: str(solverRaw.id, `${path}.solver.id`),
      profile: str(solverRaw.profile, `${path}.solver.profile`),
      anonymized: bool(solverRaw.anonymized, `${path}.solver.anonymized`),
    },
    relationToAuthor: enumValue(v.relationToAuthor, `${path}.relationToAuthor`, SOLVER_RELATIONS),
    status: enumValue(v.status, `${path}.status`, HUMAN_REVIEW_STATUSES),
    countsAsCleanRoomSolve: bool(v.countsAsCleanRoomSolve, `${path}.countsAsCleanRoomSolve`),
    reviewedChallengeHash: strNullable(v.reviewedChallengeHash, `${path}.reviewedChallengeHash`),
    gradedChallengeHash: strNullable(v.gradedChallengeHash, `${path}.gradedChallengeHash`),
    publicPackageDiffersFromGradedPackage: bool(
      v.publicPackageDiffersFromGradedPackage,
      `${path}.publicPackageDiffersFromGradedPackage`,
    ),
    publicFilesReviewed: strArr(v.publicFilesReviewed, `${path}.publicFilesReviewed`),
    hiddenFilesForbidden: strArr(v.hiddenFilesForbidden, `${path}.hiddenFilesForbidden`),
    hiddenFilesSeen: strArr(v.hiddenFilesSeen, `${path}.hiddenFilesSeen`),
    timeBudgetMinutes: maybeNum(v.timeBudgetMinutes, `${path}.timeBudgetMinutes`),
    startedAt: strNullable(v.startedAt, `${path}.startedAt`),
    endedAt: strNullable(v.endedAt, `${path}.endedAt`),
    elapsedMinutes: maybeNum(v.elapsedMinutes, `${path}.elapsedMinutes`),
    hintsUsed: arr(v.hintsUsed, `${path}.hintsUsed`, parseHint),
    questionsAsked: arr(v.questionsAsked, `${path}.questionsAsked`, parseQuestion),
    ambiguityFindings: arr(v.ambiguityFindings, `${path}.ambiguityFindings`, parseAmbiguity),
    solveOutcome: optionalText(v.solveOutcome, `${path}.solveOutcome`),
    verifier: parseVerifier(v.verifier, `${path}.verifier`),
    notesPath: strNullable(v.notesPath, `${path}.notesPath`),
    transcriptPath: strNullable(v.transcriptPath, `${path}.transcriptPath`),
  };
}

export interface HumanReviewValidationContext {
  readonly currentChallengeHash: string | null;
  readonly notesText?: string | null;
  readonly transcriptText?: string | null;
}

const nonEmpty = (s: string | null | undefined): boolean => typeof s === "string" && s.trim().length > 0;

const hasNotesOrTranscript = (record: HumanReviewRecord, context: HumanReviewValidationContext): boolean => {
  if ("notesText" in context || "transcriptText" in context) {
    return nonEmpty(context.notesText) || nonEmpty(context.transcriptText);
  }
  if (nonEmpty(context.notesText) || nonEmpty(context.transcriptText)) return true;
  return nonEmpty(record.notesPath) || nonEmpty(record.transcriptPath);
};

function humanFailure(code: RuleCode, path: string, detail: string): HumanValidationFailure {
  return { code, path, detail };
}

export function humanReviewFailures(
  record: HumanReviewRecord,
  context: HumanReviewValidationContext,
): readonly HumanValidationFailure[] {
  if (!record.countsAsCleanRoomSolve) return [];

  if (!nonEmpty(record.reviewedChallengeHash) || !nonEmpty(record.gradedChallengeHash)) {
    return [
      humanFailure(
        "HUMAN_COUNTED_HASH_MISSING",
        `human.${record.reviewId}.challengeHash`,
        "a counted clean-room review must record both the reviewed and graded challenge hash",
      ),
    ];
  }
  if (
    context.currentChallengeHash === null ||
    record.reviewedChallengeHash !== context.currentChallengeHash ||
    record.gradedChallengeHash !== context.currentChallengeHash
  ) {
    return [
      humanFailure(
        "HUMAN_COUNTED_HASH_STALE",
        `human.${record.reviewId}.challengeHash`,
        `record uses reviewed=${record.reviewedChallengeHash} graded=${record.gradedChallengeHash}; current=${context.currentChallengeHash ?? "none"}`,
      ),
    ];
  }
  if (
    record.publicPackageDiffersFromGradedPackage ||
    record.reviewedChallengeHash !== record.gradedChallengeHash
  ) {
    return [
      humanFailure(
        "HUMAN_COUNTED_PACKAGE_DIFFERS",
        `human.${record.reviewId}.gradedChallengeHash`,
        "the public package the human saw must be byte-identical to the package the verifier graded",
      ),
    ];
  }
  if (record.relationToAuthor !== "independent") {
    return [
      humanFailure(
        "HUMAN_COUNTED_AUTHOR",
        `human.${record.reviewId}.relationToAuthor`,
        `counted human-solvability evidence requires an independent solver, not ${record.relationToAuthor}`,
      ),
    ];
  }
  if (record.hiddenFilesSeen.length > 0) {
    return [
      humanFailure(
        "HUMAN_COUNTED_SAW_HIDDEN",
        `human.${record.reviewId}.hiddenFilesSeen`,
        `clean-room evidence cannot count after hidden artifacts were seen: ${record.hiddenFilesSeen.join(", ")}`,
      ),
    ];
  }
  if (
    record.hintsUsed.some((h) => h.private) ||
    record.questionsAsked.some((q) => q.answerSource === "private-context")
  ) {
    return [
      humanFailure(
        "HUMAN_COUNTED_PRIVATE_HINT",
        `human.${record.reviewId}.hintsUsed`,
        "private hints or answers move the attempt from clean-room evidence to assisted evidence",
      ),
    ];
  }
  if (!hasNotesOrTranscript(record, context)) {
    return [
      humanFailure(
        "HUMAN_COUNTED_NO_NOTES",
        `human.${record.reviewId}.notesPath`,
        "a counted human review must preserve transcript or notes",
      ),
    ];
  }
  if (
    record.timeBudgetMinutes === null ||
    record.timeBudgetMinutes <= 0 ||
    record.elapsedMinutes === null ||
    record.elapsedMinutes <= 0 ||
    !nonEmpty(record.startedAt) ||
    !nonEmpty(record.endedAt)
  ) {
    return [
      humanFailure(
        "HUMAN_COUNTED_NO_TIME_RECORD",
        `human.${record.reviewId}.elapsedMinutes`,
        "a counted human review must record start, end, elapsed time and budget",
      ),
    ];
  }
  if (record.verifier.status !== "pass" || !nonEmpty(record.verifier.outputPath)) {
    return [
      humanFailure(
        "HUMAN_COUNTED_VERIFIER_NOT_RUN",
        `human.${record.reviewId}.verifier.status`,
        "a counted clean-room solve requires preserved verifier output with a passing result",
      ),
    ];
  }
  return [];
}

export function assertHumanReviewRecordCounts(
  record: HumanReviewRecord,
  context: HumanReviewValidationContext,
): void {
  const first = humanReviewFailures(record, context)[0];
  if (first !== undefined) fail(first.code as RuleCode, first.path, first.detail);
}

export function isCleanHumanSolve(record: HumanReviewRecord, context: HumanReviewValidationContext): boolean {
  return (
    record.countsAsCleanRoomSolve &&
    record.status === "clean-pass" &&
    record.verifier.status === "pass" &&
    humanReviewFailures(record, context).length === 0
  );
}

export function assertHumanSolvabilityClaim(
  familyId: string,
  claimsHumanSolvable: boolean,
  records: readonly HumanReviewRecord[],
  currentChallengeHash: string | null,
): void {
  if (!claimsHumanSolvable) return;
  const hasClean = records.some((r) => isCleanHumanSolve(r, { currentChallengeHash }));
  if (!hasClean) {
    fail(
      "HUMAN_CLAIM_WITHOUT_CLEAN_RECORD",
      `human.${familyId}`,
      "family claims independent human solvability with zero clean, counted human review records",
    );
  }
}
