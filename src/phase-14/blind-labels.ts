import { createHash } from "node:crypto";
import { RigInputError, requireShape, rigIntegrity } from "../screens/rig-integrity.js";
import { ROOT_CAUSES, type RootCause } from "../trials/root-cause.js";

export const PHASE14_READER_FAMILIES = ["openai", "anthropic"] as const;
export type Phase14ReaderFamily = (typeof PHASE14_READER_FAMILIES)[number];

export const REQUIRED_BLINDING = [
  "other-reader-label",
  "author-diagnosis",
  "cross-cell-outcomes",
  "stopping-decision",
] as const;

export interface Phase14BlindLabel {
  readonly runId: string;
  readonly familyId: string;
  readonly readerId: string;
  readonly providerFamily: Phase14ReaderFamily;
  readonly label: RootCause;
  readonly rationale: string;
  readonly evidenceRead: readonly string[];
  readonly packetPath: string;
  readonly packetSha256: string;
  readonly independentlyProduced: true;
  readonly blindedTo: readonly string[];
}

export interface Phase14LabelDecision {
  readonly status:
    | "not-required-clean"
    | "pending"
    | "agreed-capability"
    | "agreed-noncapability"
    | "disagreed";
  readonly labelsReceived: number;
  readonly labels: readonly RootCause[];
  readonly readerFamilies: readonly Phase14ReaderFamily[];
  readonly difficultyEvidence: boolean;
}

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new RigInputError(`${path} must be a non-empty string`);
  }
  return value;
};

const stringList = (value: unknown, path: string): readonly string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new RigInputError(`${path} must be an array of strings`);
  }
  return value;
};

export function parsePhase14BlindLabel(value: unknown, path = "phase14.blindLabel"): Phase14BlindLabel {
  const row = requireShape(value, path, [
    "runId",
    "familyId",
    "readerId",
    "providerFamily",
    "label",
    "rationale",
    "evidenceRead",
    "packetPath",
    "packetSha256",
    "independentlyProduced",
    "blindedTo",
  ]);
  const providerFamily = text(row.providerFamily, `${path}.providerFamily`);
  if (!(PHASE14_READER_FAMILIES as readonly string[]).includes(providerFamily)) {
    throw new RigInputError(`${path}.providerFamily must be openai or anthropic`);
  }
  const label = text(row.label, `${path}.label`);
  if (!(ROOT_CAUSES as readonly string[]).includes(label) || label === "unlabelled") {
    throw new RigInputError(`${path}.label must be a completed label from the closed root-cause vocabulary`);
  }
  const rationale = text(row.rationale, `${path}.rationale`);
  if (rationale.length < 24) throw new RigInputError(`${path}.rationale must contain an argument`);
  const evidenceRead = stringList(row.evidenceRead, `${path}.evidenceRead`);
  if (evidenceRead.length === 0)
    throw new RigInputError(`${path}.evidenceRead must name inspected artifacts`);
  const packetSha256 = text(row.packetSha256, `${path}.packetSha256`);
  if (!/^[0-9a-f]{64}$/.test(packetSha256)) {
    throw new RigInputError(`${path}.packetSha256 must be a lowercase SHA-256 digest`);
  }
  if (row.independentlyProduced !== true) {
    throw new RigInputError(`${path}.independentlyProduced must be true`);
  }
  const blindedTo = stringList(row.blindedTo, `${path}.blindedTo`);
  const missingBlinding = REQUIRED_BLINDING.filter((item) => !blindedTo.includes(item));
  if (missingBlinding.length > 0) {
    throw new RigInputError(`${path}.blindedTo is missing ${missingBlinding.join(", ")}`);
  }
  return {
    runId: text(row.runId, `${path}.runId`),
    familyId: text(row.familyId, `${path}.familyId`),
    readerId: text(row.readerId, `${path}.readerId`),
    providerFamily: providerFamily as Phase14ReaderFamily,
    label: label as RootCause,
    rationale,
    evidenceRead,
    packetPath: text(row.packetPath, `${path}.packetPath`),
    packetSha256,
    independentlyProduced: true,
    blindedTo,
  };
}

export function adjudicatePhase14Labels(
  runId: string,
  familyId: string,
  trialFailed: boolean,
  rawLabels: readonly unknown[],
): Phase14LabelDecision {
  if (!trialFailed) {
    if (rawLabels.length > 0) {
      throw new RigInputError("a clean trial has no failure for a root-cause label to attribute");
    }
    return {
      status: "not-required-clean",
      labelsReceived: 0,
      labels: [],
      readerFamilies: [],
      difficultyEvidence: false,
    };
  }
  if (rawLabels.length > 2) throw new RigInputError("phase14 requires exactly two blind labels per failure");

  const labels = rawLabels.map((row, index) => parsePhase14BlindLabel(row, `phase14.labels[${index}]`));
  if (labels.length < 2) {
    return {
      status: "pending",
      labelsReceived: labels.length,
      labels: labels.map((label) => label.label),
      readerFamilies: labels.map((label) => label.providerFamily),
      difficultyEvidence: false,
    };
  }
  if (labels.some((label) => label.runId !== runId || label.familyId !== familyId)) {
    throw new RigInputError("phase14 blind labels must name the trial they adjudicate");
  }
  if (new Set(labels.map((label) => label.readerId)).size !== 2) {
    throw new RigInputError("phase14 blind labels must come from two distinct readers");
  }
  if (new Set(labels.map((label) => label.providerFamily)).size !== 2) {
    throw new RigInputError("phase14 blind labels must come from two provider families");
  }
  if (labels.some((label) => label.label === "clean")) {
    throw new RigInputError("a clean label cannot adjudicate a failing trial");
  }

  const agreed = labels[0]?.label === labels[1]?.label;
  const capability = agreed && labels[0]?.label === "capability";
  return {
    status: capability ? "agreed-capability" : agreed ? "agreed-noncapability" : "disagreed",
    labelsReceived: labels.length,
    labels: labels.map((label) => label.label),
    readerFamilies: labels.map((label) => label.providerFamily),
    difficultyEvidence: capability,
  };
}

const fixture = (providerFamily: Phase14ReaderFamily, readerId: string): Phase14BlindLabel => ({
  runId: "b6-run",
  familyId: "b6-family",
  readerId,
  providerFamily,
  label: "capability",
  rationale: "The visible contract determines the behavior and the submitted artifact violates it.",
  evidenceRead: ["challenge/SPEC.md", "submission/subject.mjs", "verifier-output.json"],
  packetPath: `labels/${readerId}/packet.json`,
  packetSha256: createHash("sha256").update(readerId).digest("hex"),
  independentlyProduced: true,
  blindedTo: [...REQUIRED_BLINDING],
});

export function phase14LabelRigIntegrity(): {
  readonly usable: boolean;
  readonly knownGoodPassed: boolean;
  readonly knownBadFailed: boolean;
  readonly malformedInputRefused: boolean;
} {
  const openai = fixture("openai", "reader-openai");
  const anthropic = fixture("anthropic", "reader-anthropic");
  const good = adjudicatePhase14Labels("b6-run", "b6-family", true, [openai, anthropic]);
  let knownBadFailed = false;
  try {
    adjudicatePhase14Labels("b6-run", "b6-family", true, [openai, fixture("openai", "reader-two")]);
  } catch {
    knownBadFailed = true;
  }
  let malformedInputRefused = false;
  try {
    parsePhase14BlindLabel({});
  } catch {
    malformedInputRefused = true;
  }
  const knownGoodPassed = good.status === "agreed-capability" && good.difficultyEvidence;
  const integrity = rigIntegrity(
    "phase-14-blind-label-adjudication",
    [
      {
        id: "cross-provider-capability-pair",
        expect: "pass",
        observedFailures: knownGoodPassed ? [] : ["not accepted"],
      },
      { id: "same-provider-pair", expect: "fail", observedFailures: knownBadFailed ? ["refused"] : [] },
    ],
    [knownGoodPassed ? [] : ["not accepted"], knownBadFailed ? ["refused"] : []],
  );
  return { usable: integrity.usable, knownGoodPassed, knownBadFailed, malformedInputRefused };
}
