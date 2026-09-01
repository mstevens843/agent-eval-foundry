import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fail } from "../foundry/schema.js";
import {
  DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID,
  auditExternalEvidencePacket,
  externalPacketAuditFindings,
} from "./packet.js";
import type { ExternalIntakeValidationResult, ExternalPacketAudit, ExternalProviderFamily } from "./types.js";

const PROVIDERS = ["claude", "gemini", "external"] as const;

export function auditDeploymentAliasExternalPackets(root: string): readonly ExternalPacketAudit[] {
  return PROVIDERS.map((providerId) =>
    auditExternalEvidencePacket(
      root,
      DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID,
      providerId,
      join(root, "bundles", `${DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID}-${providerId}`),
    ),
  );
}

export function loadExternalIntakeResults(
  root: string,
  familyId = DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID,
): readonly ExternalIntakeValidationResult[] {
  const base = join(root, "external-intake", "received");
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((name) => {
      const path = join(base, name, "intake-result.json");
      if (!existsSync(path)) return [];
      const parsed = JSON.parse(readFileSync(path, "utf8")) as ExternalIntakeValidationResult;
      return parsed.packet.familyId === familyId ? [parsed] : [];
    });
}

export function assertExternalIntakeResultsValid(root: string): void {
  for (const audit of auditDeploymentAliasExternalPackets(root)) {
    const first = externalPacketAuditFindings(audit)[0];
    if (first !== undefined) fail(first.code, first.path, first.detail);
  }
  for (const result of loadExternalIntakeResults(root)) {
    if (result.countable && result.findings.length > 0) {
      const first = result.findings[0];
      if (first === undefined) continue;
      fail(first.code, first.path, first.detail);
    }
    if (result.countable && result.status !== "completed") {
      fail(
        "EXTERNAL_INTAKE_METADATA_MISSING",
        `${result.packet.dir}/intake-result.json`,
        `countable external packet has non-completed status ${result.status}`,
      );
    }
  }
}

export function renderExternalIntakeReport(input: {
  readonly familyId: string;
  readonly expectedHash: string;
  readonly expectedScenarioSetId: string;
  readonly packetAudits: readonly ExternalPacketAudit[];
  readonly intakeResults: readonly ExternalIntakeValidationResult[];
}): string {
  const counted = input.intakeResults.filter((result) => result.countable);
  const noCount = input.intakeResults.filter((result) => !result.countable);
  return [
    `# ${input.familyId} external evidence intake`,
    "",
    "External intake is the boundary between third-party evidence and counted trial evidence. It",
    "accepts only returned packets that preserve the current challenge hash, scenario set, provider",
    "identity, transcript, submission, verifier output and no hidden artifacts.",
    "",
    "| item | value |",
    "|---|---|",
    `| expected challenge hash | \`${input.expectedHash}\` |`,
    `| expected scenario set | \`${input.expectedScenarioSetId}\` |`,
    `| prepared packets | ${input.packetAudits.filter((audit) => audit.present).length}/${input.packetAudits.length} |`,
    `| imported returned packets | ${input.intakeResults.length} |`,
    `| countable returned packets | ${counted.length} |`,
    `| preserved no-count packets | ${noCount.length} |`,
    "",
    "## Prepared Packets",
    "",
    "| provider | present | hash | required templates | leak check | missing |",
    "|---|---|---|---|---|---|",
    ...input.packetAudits.map(
      (audit) =>
        `| \`${audit.providerId}\` | ${audit.present ? "yes" : "no"} | ${
          audit.challengeHash === null ? "missing" : `\`${audit.challengeHash}\``
        } | ${audit.requiredFilesPresent ? "pass" : "fail"} | ${audit.leakCheck} | ${
          audit.missingRequiredFiles.length === 0
            ? "none"
            : audit.missingRequiredFiles.map((file) => `\`${file}\``).join(", ")
        } |`,
    ),
    "",
    "## Returned Packet Results",
    "",
    input.intakeResults.length === 0
      ? "No returned external packets have been imported yet."
      : [
          "| run | provider family | status | countable | reason |",
          "|---|---|---|---|---|",
          ...input.intakeResults.map((result) => {
            const metadata = result.packet.metadata;
            return `| \`${metadata?.runId ?? "missing"}\` | \`${metadata?.providerFamily ?? "missing"}\` | \`${result.status}\` | ${
              result.countable ? "yes" : "no"
            } | ${result.countabilityReason} |`;
          }),
        ].join("\n"),
    "",
    "## Countability Rules",
    "",
    "- Missing or stale challenge hashes are preserved but cannot count.",
    "- A modified `challenge/` directory cannot count, even if `metadata.json` claims the current hash.",
    "- Provider refusal, infrastructure error, timeout and contamination are preserved as no-count records.",
    "- Hidden verifier, reference, scenario, mutant or answer-matrix artifacts contaminate the packet.",
    "- Provider and model identity must be explicit; external/manual is not a provider-lab claim.",
    "- A verifier output file must name the same `runId` as the metadata.",
    "",
    "## Cross-Lab Boundary",
    "",
    `Current countable external provider families: ${providerFamilies(counted).join(", ") || "none"}.`,
    "No cross-lab claim exists until a non-OpenAI completed run imports cleanly under this hash.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

function providerFamilies(results: readonly ExternalIntakeValidationResult[]): readonly string[] {
  return [
    ...new Set(
      results
        .map((result) => result.packet.metadata?.providerFamily)
        .filter((family): family is ExternalProviderFamily => family !== null && family !== undefined),
    ),
  ].sort();
}
