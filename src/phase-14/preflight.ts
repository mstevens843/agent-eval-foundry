import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RigInputError, requireShape, rigIntegrity } from "../screens/rig-integrity.js";
import { type CampaignPlan, parseCampaignPlan } from "../trials/campaign.js";
import { phase14LabelRigIntegrity } from "./blind-labels.js";
import { PHASE14_FAMILIES, buildPhase14PackageLock } from "./packages.js";
import type { Phase14FamilyId, Phase14PackageRow } from "./packages.js";
import { phase14ProviderContainerB6 } from "./provider-runtime.js";

const PHASE13_CAMPAIGNS: Readonly<Record<Phase14FamilyId, string>> = {
  "dao-descendant": "campaigns/dao-descendant-transfer-smoke-2026-09.json",
  "trading-reconciliation-recompute":
    "campaigns/trading-reconciliation-recompute-transfer-smoke-2026-09.json",
  "deployment-rollback-recompute": "campaigns/deployment-rollback-recompute-transfer-smoke-2026-09.json",
};

export interface Phase14ProviderPreflight {
  readonly providerFamily: "openai" | "anthropic";
  readonly subjectExecutionAvailable: boolean;
  readonly blindLabellingAvailable: boolean;
  readonly mode: string;
  readonly evidence: string;
}

export interface Phase14PreflightObservations {
  readonly schema: "agent-eval-foundry/phase-14-preflight-observations@1";
  readonly observedAt: string;
  readonly baselineCommit: string;
  readonly verification: readonly {
    readonly id: string;
    readonly command: string;
    readonly passed: boolean;
    readonly detail: string;
  }[];
  readonly providers: readonly Phase14ProviderPreflight[];
  readonly isolation: {
    readonly dockerDaemonAvailable: boolean;
    readonly dockerServerVersion: string;
    readonly artifactNoNetworkSmokePassed: boolean;
    readonly providerAgentContainerIntegrated: boolean;
    readonly detail: string;
  };
  readonly capture: {
    readonly fullArtifactContractImplemented: boolean;
    readonly costFieldsImplemented: boolean;
    readonly detail: string;
  };
  readonly phase13Audit: {
    readonly campaignHashesCurrent: boolean;
    readonly localB6PassedForAllFamilies: boolean;
    readonly campaignIsolation: string;
    readonly agentOutputObservedBeforeRegistration: boolean;
  };
  readonly providerProbeSpend: {
    readonly providerReportedUsd: number;
    readonly unpricedCalls: number;
    readonly detail: string;
  };
}

export interface Phase14PreflightResult {
  readonly schema: "agent-eval-foundry/phase-14-preflight@1";
  readonly observationsPath: string;
  readonly observedAt: string;
  readonly baselineCommit: string;
  readonly ready: boolean;
  readonly blockers: readonly string[];
  readonly providers: readonly Phase14ProviderPreflight[];
  readonly isolation: Phase14PreflightObservations["isolation"];
  readonly capture: Phase14PreflightObservations["capture"];
  readonly verification: Phase14PreflightObservations["verification"];
  readonly phase13Campaigns: readonly {
    readonly familyId: Phase14FamilyId;
    readonly path: string;
    readonly challengeHash: string;
    readonly hashCurrent: boolean;
    readonly scenarioSetCurrent: boolean;
    readonly slotsNotRun: number;
    readonly slots: number;
    readonly isolation: "subprocess" | "container";
    readonly auditFailures: readonly string[];
  }[];
  readonly b6: {
    readonly usable: boolean;
    readonly knownGoodPassed: boolean;
    readonly knownBadFailed: boolean;
    readonly malformedInputRefused: boolean;
    readonly packageDeltaRigUsable: boolean;
    readonly blindLabelRigUsable: boolean;
    readonly campaignManifestRigUsable: boolean;
    readonly providerContainerPlanRigUsable: boolean;
  };
  readonly subjectAttemptsRun: 0;
  /** Backward-compatible alias: subject campaign spend, excluding authentication probes. */
  readonly spendUsd: 0;
  readonly subjectSpendUsd: 0;
  readonly preflightProbeSpendUsd: number;
  readonly unpricedPreflightCalls: number;
}

const nonEmpty = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new RigInputError(`${path} must be a string`);
  return value;
};

const bool = (value: unknown, path: string): boolean => {
  if (typeof value !== "boolean") throw new RigInputError(`${path} must be boolean`);
  return value;
};

const nonNegativeNumber = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RigInputError(`${path} must be a non-negative number`);
  }
  return value;
};

export function parsePhase14PreflightObservations(
  value: unknown,
  path = "phase14.preflightObservations",
): Phase14PreflightObservations {
  const top = requireShape(value, path, [
    "schema",
    "observedAt",
    "baselineCommit",
    "verification",
    "providers",
    "isolation",
    "capture",
    "phase13Audit",
    "providerProbeSpend",
  ]);
  if (top.schema !== "agent-eval-foundry/phase-14-preflight-observations@1") {
    throw new RigInputError(`${path}.schema is unsupported`);
  }
  if (!Array.isArray(top.verification) || top.verification.length === 0) {
    throw new RigInputError(`${path}.verification must contain checks`);
  }
  const verification = top.verification.map((raw, index) => {
    const row = requireShape(raw, `${path}.verification[${index}]`, ["id", "command", "passed", "detail"]);
    return {
      id: nonEmpty(row.id, `${path}.verification[${index}].id`),
      command: nonEmpty(row.command, `${path}.verification[${index}].command`),
      passed: bool(row.passed, `${path}.verification[${index}].passed`),
      detail: nonEmpty(row.detail, `${path}.verification[${index}].detail`),
    };
  });
  if (!Array.isArray(top.providers) || top.providers.length !== 2) {
    throw new RigInputError(`${path}.providers must contain exactly OpenAI and Anthropic`);
  }
  const providers = top.providers.map((raw, index): Phase14ProviderPreflight => {
    const row = requireShape(raw, `${path}.providers[${index}]`, [
      "providerFamily",
      "subjectExecutionAvailable",
      "blindLabellingAvailable",
      "mode",
      "evidence",
    ]);
    const providerFamily = nonEmpty(row.providerFamily, `${path}.providers[${index}].providerFamily`);
    if (providerFamily !== "openai" && providerFamily !== "anthropic") {
      throw new RigInputError(`${path}.providers[${index}].providerFamily is unsupported`);
    }
    return {
      providerFamily,
      subjectExecutionAvailable: bool(
        row.subjectExecutionAvailable,
        `${path}.providers[${index}].subjectExecutionAvailable`,
      ),
      blindLabellingAvailable: bool(
        row.blindLabellingAvailable,
        `${path}.providers[${index}].blindLabellingAvailable`,
      ),
      mode: nonEmpty(row.mode, `${path}.providers[${index}].mode`),
      evidence: nonEmpty(row.evidence, `${path}.providers[${index}].evidence`),
    };
  });
  if (new Set(providers.map((provider) => provider.providerFamily)).size !== 2) {
    throw new RigInputError(`${path}.providers must contain distinct OpenAI and Anthropic rows`);
  }
  const isolation = requireShape(top.isolation, `${path}.isolation`, [
    "dockerDaemonAvailable",
    "dockerServerVersion",
    "artifactNoNetworkSmokePassed",
    "providerAgentContainerIntegrated",
    "detail",
  ]);
  const capture = requireShape(top.capture, `${path}.capture`, [
    "fullArtifactContractImplemented",
    "costFieldsImplemented",
    "detail",
  ]);
  const phase13Audit = requireShape(top.phase13Audit, `${path}.phase13Audit`, [
    "campaignHashesCurrent",
    "localB6PassedForAllFamilies",
    "campaignIsolation",
    "agentOutputObservedBeforeRegistration",
  ]);
  const providerProbeSpend = requireShape(top.providerProbeSpend, `${path}.providerProbeSpend`, [
    "providerReportedUsd",
    "unpricedCalls",
    "detail",
  ]);
  return {
    schema: "agent-eval-foundry/phase-14-preflight-observations@1",
    observedAt: nonEmpty(top.observedAt, `${path}.observedAt`),
    baselineCommit: nonEmpty(top.baselineCommit, `${path}.baselineCommit`),
    verification,
    providers,
    isolation: {
      dockerDaemonAvailable: bool(isolation.dockerDaemonAvailable, `${path}.isolation.dockerDaemonAvailable`),
      dockerServerVersion: nonEmpty(isolation.dockerServerVersion, `${path}.isolation.dockerServerVersion`),
      artifactNoNetworkSmokePassed: bool(
        isolation.artifactNoNetworkSmokePassed,
        `${path}.isolation.artifactNoNetworkSmokePassed`,
      ),
      providerAgentContainerIntegrated: bool(
        isolation.providerAgentContainerIntegrated,
        `${path}.isolation.providerAgentContainerIntegrated`,
      ),
      detail: nonEmpty(isolation.detail, `${path}.isolation.detail`),
    },
    capture: {
      fullArtifactContractImplemented: bool(
        capture.fullArtifactContractImplemented,
        `${path}.capture.fullArtifactContractImplemented`,
      ),
      costFieldsImplemented: bool(capture.costFieldsImplemented, `${path}.capture.costFieldsImplemented`),
      detail: nonEmpty(capture.detail, `${path}.capture.detail`),
    },
    phase13Audit: {
      campaignHashesCurrent: bool(
        phase13Audit.campaignHashesCurrent,
        `${path}.phase13Audit.campaignHashesCurrent`,
      ),
      localB6PassedForAllFamilies: bool(
        phase13Audit.localB6PassedForAllFamilies,
        `${path}.phase13Audit.localB6PassedForAllFamilies`,
      ),
      campaignIsolation: nonEmpty(phase13Audit.campaignIsolation, `${path}.phase13Audit.campaignIsolation`),
      agentOutputObservedBeforeRegistration: bool(
        phase13Audit.agentOutputObservedBeforeRegistration,
        `${path}.phase13Audit.agentOutputObservedBeforeRegistration`,
      ),
    },
    providerProbeSpend: {
      providerReportedUsd: nonNegativeNumber(
        providerProbeSpend.providerReportedUsd,
        `${path}.providerProbeSpend.providerReportedUsd`,
      ),
      unpricedCalls: nonNegativeNumber(
        providerProbeSpend.unpricedCalls,
        `${path}.providerProbeSpend.unpricedCalls`,
      ),
      detail: nonEmpty(providerProbeSpend.detail, `${path}.providerProbeSpend.detail`),
    },
  };
}

export function phase14PreflightFailures(observations: Phase14PreflightObservations): readonly string[] {
  const failures: string[] = [];
  for (const check of observations.verification) {
    if (!check.passed) failures.push(`baseline verification failed: ${check.id}`);
  }
  for (const providerFamily of ["openai", "anthropic"] as const) {
    const provider = observations.providers.find((row) => row.providerFamily === providerFamily);
    if (provider === undefined || !provider.subjectExecutionAvailable) {
      failures.push(`${providerFamily} subject execution unavailable`);
    }
    if (provider === undefined || !provider.blindLabellingAvailable) {
      failures.push(`${providerFamily} blind labelling unavailable`);
    }
  }
  if (!observations.isolation.dockerDaemonAvailable) failures.push("container daemon unavailable");
  if (!observations.isolation.artifactNoNetworkSmokePassed) {
    failures.push("submitted-artifact no-network container smoke failed");
  }
  if (!observations.isolation.providerAgentContainerIntegrated) {
    failures.push("provider-agent container execution is not integrated for both provider CLIs");
  }
  if (!observations.capture.fullArtifactContractImplemented)
    failures.push("full artifact capture unavailable");
  if (!observations.capture.costFieldsImplemented) failures.push("cost recording unavailable");
  if (!observations.phase13Audit.campaignHashesCurrent) failures.push("Phase 13 campaign hash drift");
  if (!observations.phase13Audit.localB6PassedForAllFamilies) failures.push("Phase 13 local B6 failure");
  if (observations.phase13Audit.agentOutputObservedBeforeRegistration) {
    failures.push("agent output predates the Phase 14 preregistration");
  }
  return failures;
}

const passingFixture = (source: Phase14PreflightObservations): Phase14PreflightObservations => ({
  ...source,
  verification: source.verification.map((check) => ({ ...check, passed: true })),
  providers: source.providers.map((provider) => ({
    ...provider,
    subjectExecutionAvailable: true,
    blindLabellingAvailable: true,
  })),
  isolation: {
    ...source.isolation,
    dockerDaemonAvailable: true,
    artifactNoNetworkSmokePassed: true,
    providerAgentContainerIntegrated: true,
  },
  capture: { ...source.capture, fullArtifactContractImplemented: true, costFieldsImplemented: true },
  phase13Audit: {
    ...source.phase13Audit,
    campaignHashesCurrent: true,
    localB6PassedForAllFamilies: true,
    agentOutputObservedBeforeRegistration: false,
  },
});

const campaignFailures = (
  plan: CampaignPlan,
  familyId: Phase14FamilyId,
  locked: Phase14PackageRow,
): readonly string[] => [
  ...(plan.familyId === familyId ? [] : [`family is ${plan.familyId}`]),
  ...(plan.challengeHash === locked.challengeHash ? [] : ["challenge hash is stale"]),
  ...(plan.scenarioSetId === locked.scenarioSetId ? [] : ["scenario set is stale"]),
  ...(plan.scenariosExpected === 24 ? [] : [`expected ${plan.scenariosExpected} scenarios`]),
  ...(plan.slots.length === 2 ? [] : [`has ${plan.slots.length} slots`]),
  ...plan.slots
    .filter((slot) => slot.state !== "NOT_RUN" || slot.runId !== null)
    .map((slot) => `${slot.slotId} is not an empty preregistered slot`),
];

export function buildPhase14Preflight(root: string): Phase14PreflightResult {
  const observationsPath = "data/phase-14-preflight-observations.json";
  const observations = parsePhase14PreflightObservations(
    JSON.parse(readFileSync(join(root, observationsPath), "utf8")),
  );
  const actualFailures = phase14PreflightFailures(observations);
  const goodFailures = phase14PreflightFailures(passingFixture(observations));
  const knownBad = passingFixture(observations);
  const badFailures = phase14PreflightFailures({
    ...knownBad,
    providers: knownBad.providers.map((provider) =>
      provider.providerFamily === "anthropic" ? { ...provider, subjectExecutionAvailable: false } : provider,
    ),
  });
  let malformedInputRefused = false;
  try {
    parsePhase14PreflightObservations({});
  } catch {
    malformedInputRefused = true;
  }
  const integrity = rigIntegrity(
    "phase-14-preflight",
    [
      { id: "all-prerequisites-present", expect: "pass", observedFailures: goodFailures },
      { id: "missing-anthropic-subject-runner", expect: "fail", observedFailures: badFailures },
    ],
    [goodFailures, badFailures],
  );
  const packageLock = buildPhase14PackageLock(root);
  const packageRig = packageLock.b6;
  const campaignPlans = PHASE14_FAMILIES.map((familyId) => {
    const path = PHASE13_CAMPAIGNS[familyId];
    const plan = parseCampaignPlan(JSON.parse(readFileSync(join(root, path), "utf8")), path);
    const locked = packageLock.rows.find(
      (row) => row.familyId === familyId && row.starterProfile === "seeded-recompute",
    );
    if (locked === undefined) throw new Error(`missing seeded package lock for ${familyId}`);
    return { familyId, path, plan, locked, failures: campaignFailures(plan, familyId, locked) };
  });
  const campaignGoodFailures = campaignPlans.flatMap((campaign) => campaign.failures);
  const firstCampaign = campaignPlans[0];
  if (firstCampaign === undefined) throw new Error("Phase 14 has no campaign control fixture");
  const campaignBadFailures = campaignFailures(
    { ...firstCampaign.plan, challengeHash: "0".repeat(32) },
    firstCampaign.familyId,
    firstCampaign.locked,
  );
  let malformedCampaignRefused = false;
  try {
    parseCampaignPlan({});
  } catch {
    malformedCampaignRefused = true;
  }
  const campaignIntegrity = rigIntegrity(
    "phase-14-phase-13-campaign-audit",
    [
      {
        id: "current-phase-13-campaigns",
        expect: "pass",
        observedFailures: campaignGoodFailures,
      },
      {
        id: "stale-challenge-hash",
        expect: "fail",
        observedFailures: campaignBadFailures,
      },
    ],
    [campaignGoodFailures, campaignBadFailures],
  );
  const labelRig = phase14LabelRigIntegrity();
  const providerContainerRig = phase14ProviderContainerB6();
  const b6Usable =
    integrity.usable &&
    malformedInputRefused &&
    packageRig.usable &&
    packageRig.malformedInputRefused &&
    campaignIntegrity.usable &&
    malformedCampaignRefused &&
    labelRig.usable &&
    labelRig.malformedInputRefused &&
    providerContainerRig.usable;
  const blockers = [
    ...actualFailures,
    ...(packageLock.phase13PreregistrationPreserved
      ? []
      : ["Phase 13 preregistration hash no longer matches the frozen Phase 14 input"]),
    ...campaignPlans.flatMap((campaign) =>
      campaign.failures.map((failure) => `${campaign.familyId} Phase 13 campaign: ${failure}`),
    ),
    ...(b6Usable ? [] : ["Phase 14 B6 controls did not hold"]),
  ];
  return {
    schema: "agent-eval-foundry/phase-14-preflight@1",
    observationsPath,
    observedAt: observations.observedAt,
    baselineCommit: observations.baselineCommit,
    ready: blockers.length === 0,
    blockers,
    providers: observations.providers,
    isolation: observations.isolation,
    capture: observations.capture,
    verification: observations.verification,
    phase13Campaigns: campaignPlans.map((campaign) => ({
      familyId: campaign.familyId,
      path: campaign.path,
      challengeHash: campaign.plan.challengeHash,
      hashCurrent: campaign.plan.challengeHash === campaign.locked.challengeHash,
      scenarioSetCurrent: campaign.plan.scenarioSetId === campaign.locked.scenarioSetId,
      slotsNotRun: campaign.plan.slots.filter((slot) => slot.state === "NOT_RUN").length,
      slots: campaign.plan.slots.length,
      isolation: campaign.plan.isolation,
      auditFailures: campaign.failures,
    })),
    b6: {
      usable: b6Usable,
      knownGoodPassed: goodFailures.length === 0,
      knownBadFailed: badFailures.length > 0,
      malformedInputRefused,
      packageDeltaRigUsable: packageRig.usable && packageRig.malformedInputRefused,
      blindLabelRigUsable: labelRig.usable && labelRig.malformedInputRefused,
      campaignManifestRigUsable: campaignIntegrity.usable && malformedCampaignRefused,
      providerContainerPlanRigUsable: providerContainerRig.usable,
    },
    subjectAttemptsRun: 0,
    spendUsd: 0,
    subjectSpendUsd: 0,
    preflightProbeSpendUsd: observations.providerProbeSpend.providerReportedUsd,
    unpricedPreflightCalls: observations.providerProbeSpend.unpricedCalls,
  };
}

export const renderPhase14Preflight = (result: Phase14PreflightResult): string =>
  `${JSON.stringify(result, null, 2)}\n`;
