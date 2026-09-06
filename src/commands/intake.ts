// intake: extracted compatibility command services. Core APIs remain independent of dispatch.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { importExternalRunPacket } from "../external-intake/import.js";
import {
  DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID,
  auditExternalEvidencePacket,
} from "../external-intake/packet.js";
import {
  auditDeploymentAliasExternalPackets,
  loadExternalIntakeResults,
  renderExternalIntakeReport,
} from "../external-intake/report.js";
import { validateExternalRunPacket } from "../external-intake/validate.js";
import { auditHumanReadinessForFamilies } from "../human-solvability/readiness.js";
import { humanEvidenceForFamilies } from "../human-solvability/records.js";
import { renderHumanReadinessReport, renderHumanSolvabilityReport } from "../human-solvability/report.js";
import { prepareProviderBundle } from "../trials/cross-provider.js";
import { readFamilyTrials } from "../trials/directory.js";
import { scenarioSetId } from "../trials/orchestrate.js";
import { routeFor } from "../trials/router.js";
import { currentChallenge } from "../trials/run.js";
import { challengeHash } from "../trials/run.js";
import { flag, positional } from "./arguments.js";
import { reportLedgers } from "./evidence.js";

export function humanCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "readiness";
  if (sub === "readiness") return renderHumanReadinessReport(auditHumanReadinessForFamilies(root));
  if (sub === "solvability") return renderHumanSolvabilityReport(humanEvidenceForFamilies(root));
  throw new Error(`unknown human subcommand "${sub}"; expected readiness | solvability`);
}

export function externalValidationSummary(result: ReturnType<typeof validateExternalRunPacket>): string {
  const metadata = result.packet.metadata;
  return [
    "external intake validation",
    `run        ${metadata?.runId ?? "missing"}`,
    `family     ${result.packet.familyId}`,
    `status     ${result.status}`,
    `counts     ${result.countable ? "yes" : "NO"} — ${result.countabilityReason}`,
    `challenge  ${result.packet.actualChallengeHash ?? "missing"} (expected ${result.packet.expectedChallengeHash})`,
    `scenario   ${metadata?.scenarioSetId ?? "missing"} (expected ${result.packet.expectedScenarioSetId})`,
    `provider   ${metadata?.providerFamily ?? "missing"} / ${metadata?.provider ?? "missing"} / ${metadata?.model ?? "missing"}`,
    `transcript ${result.packet.transcriptPath === null ? "missing" : result.packet.transcriptPath}`,
    `submission ${result.packet.submissionFiles.length === 0 ? "missing" : result.packet.submissionFiles.join(", ")}`,
    `verifier   ${result.packet.verifierOutputPath === null ? "missing" : result.packet.verifierOutputPath}`,
    "",
    result.findings.length === 0
      ? "No intake validation findings."
      : ["Findings:", ...result.findings.map((f) => `  ${f.code} ${f.path}: ${f.detail}`), ""].join("\n"),
  ].join("\n");
}

export function externalVerifierOutputCommand(packetDir: string, root: string, familyId: string): string {
  const metaPath = join(packetDir, "metadata.json");
  const metadata = existsSync(metaPath)
    ? (JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>)
    : {};
  const runId = typeof metadata.runId === "string" ? metadata.runId : "missing-run-id";
  const prepared = currentChallenge(root, familyId);
  const route = routeFor(familyId);
  const graded = route.grade(join(packetDir, "submission", "subject.mjs"));
  const verifierOutput = {
    runId,
    familyId,
    challengeHash: prepared.hash,
    scenarioSetId: prepared.scenarioSetId,
    cells: graded.cells,
    detail: graded.detail,
    hostErrors: graded.hostErrors,
  };
  writeFileSync(
    join(packetDir, "verifier-output.json"),
    `${JSON.stringify(verifierOutput, null, 2)}\n`,
    "utf8",
  );
  return [
    "external verifier output",
    `run        ${runId}`,
    `family     ${familyId}`,
    `challenge  ${prepared.hash}`,
    `scenario   ${prepared.scenarioSetId}`,
    `cells      ${graded.cells.length}`,
    `failed     ${graded.cells.filter((cell) => cell.failed.length > 0).length}`,
    `hostErrors ${graded.hostErrors}`,
    `wrote      ${join(packetDir, "verifier-output.json")}`,
    "",
  ].join("\n");
}

export function externalCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "report";
  const familyId = flag(argv, "--family") ?? DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID;
  if (familyId !== DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID) {
    throw new Error("external intake v1 is implemented for deployment-model-alias-rollout-drift");
  }
  if (sub === "packet") {
    const providerId = flag(argv, "--provider") ?? "external";
    const out = flag(argv, "--out");
    if (out === null) throw new Error("external packet needs --out <dir>");
    const bundle = prepareProviderBundle(root, familyId, providerId, out);
    const audit = auditExternalEvidencePacket(root, familyId, providerId, out);
    return [
      `family      ${familyId}`,
      `provider    ${providerId}`,
      `challenge   ${bundle.challenge.hash}`,
      `scenario    ${bundle.challenge.scenarioSetId}`,
      `packet      ${out}`,
      `templates   ${audit.requiredFilesPresent ? "pass" : `missing ${audit.missingRequiredFiles.join(", ")}`}`,
      `leak check  ${audit.leakCheck} — ${audit.leakDetail}`,
      "",
      `Validate returned packet with: node dist/cli.js external validate ${out}`,
      `Import returned packet with:   node dist/cli.js external import ${out}`,
      "",
    ].join("\n");
  }
  if (sub === "validate") {
    const dir = positional(argv, 2);
    if (dir === undefined) throw new Error("external validate needs a packet directory");
    const prepared = currentChallenge(root, familyId);
    const existingRunIds = readFamilyTrials(join(root, "trials"), familyId).map((trial) => trial.runId);
    return externalValidationSummary(
      validateExternalRunPacket(root, dir, {
        familyId,
        currentChallengeHash: prepared.hash,
        expectedScenarioSetId: prepared.scenarioSetId,
        existingRunIds,
      }),
    );
  }
  if (sub === "verify") {
    const dir = positional(argv, 2);
    if (dir === undefined) throw new Error("external verify needs a packet directory");
    return externalVerifierOutputCommand(dir, root, familyId);
  }
  if (sub === "import") {
    const dir = positional(argv, 2);
    if (dir === undefined) throw new Error("external import needs a packet directory");
    const result = importExternalRunPacket(root, familyId, dir);
    return [
      externalValidationSummary(result.validation),
      `preserved  ${result.preservedDir}`,
      `trial dir  ${result.trialDir ?? "not written"}`,
      "",
    ].join("\n");
  }
  if (sub === "report") {
    const prepared = currentChallenge(root, familyId);
    return renderExternalIntakeReport({
      familyId,
      expectedHash: prepared.hash,
      expectedScenarioSetId: prepared.scenarioSetId,
      packetAudits: auditDeploymentAliasExternalPackets(root),
      intakeResults: loadExternalIntakeResults(root, familyId),
      ledgers: reportLedgers(root),
    });
  }
  throw new Error(
    `unknown external subcommand "${sub}"; expected packet | validate | verify | import | report`,
  );
}
