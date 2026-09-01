import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEPLOYMENT_ALIAS_PROFILE, checkChallengePackage } from "../challenge/package-check.js";
import type { ProviderSpec } from "../trials/provider-registry.js";
import type { PreparedChallenge } from "../trials/run.js";
import { hashChallengeDir } from "../trials/run.js";
import {
  EXTERNAL_PACKET_REQUIRED_FILES,
  type ExternalIntakeFinding,
  type ExternalPacketAudit,
  type ExternalProviderFamily,
} from "./types.js";

export const DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID = "deployment-model-alias-rollout-drift";

const expectedTree = [
  "challenge/",
  "submission/subject.mjs",
  "transcript.txt or transcript.json",
  "metadata.json",
  "verifier-output.json",
  "run-summary.json (optional)",
] as const;

const instructionFiles = [
  "README.md",
  "RUN_INSTRUCTIONS.md",
  "SUBMISSION_TEMPLATE.md",
  "METADATA_TEMPLATE.json",
  "VERIFY_COMMANDS.md",
  "DO_NOT_INCLUDE.md",
  "challenge_hash.txt",
  "scenario_set_id.txt",
] as const;

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

function providerFamilyFor(provider: ProviderSpec): ExternalProviderFamily {
  return provider.family === "anthropic" || provider.family === "openai" || provider.family === "google"
    ? provider.family
    : "external";
}

function metadataTemplate(familyId: string, provider: ProviderSpec, challenge: PreparedChallenge): string {
  return json({
    runId: `${familyId}-${provider.id}-EDITME`,
    familyId,
    providerFamily: providerFamilyFor(provider),
    provider: provider.id,
    providerLabel: provider.label,
    model: provider.model,
    subjectId: provider.subjectId,
    effort: provider.effort,
    runtime: "REPLACE: CLI, web UI, agent harness, or manual external runner",
    runDate: "YYYY-MM-DD",
    scenarioSetId: challenge.scenarioSetId,
    challengeHash: challenge.hash,
    status: "completed",
    countsRequested: true,
    relationToAuthor: "independent",
    privateHintsUsed: false,
    hiddenFilesSeen: [],
    publicPackageModified: false,
    verifierOutputPath: "verifier-output.json",
    transcriptPath: "transcript.txt",
    submissionPath: "submission/subject.mjs",
    isolation: "external-public-package",
    runtimeSeconds: null,
    costUsd: null,
    notes: "REPLACE: how the model or human was run, whether it refused or errored, and anything unusual.",
  });
}

const readme = (familyId: string, provider: ProviderSpec, challenge: PreparedChallenge): string =>
  [
    `# External evidence packet: ${familyId}`,
    "",
    "This packet is for a third-party model or human run. It exists to make outside evidence",
    "countable without importing hidden context into the run.",
    "",
    "| item | pinned value |",
    "|---|---|",
    `| challenge hash | \`${challenge.hash}\` |`,
    `| scenario set | \`${challenge.scenarioSetId}\` |`,
    `| provider slot | \`${provider.id}\` / \`${provider.model}\` |`,
    "",
    "Return the whole directory after the run. The returned packet must include:",
    "",
    ...expectedTree.map((line) => `- \`${line}\``),
    "",
    "Rules:",
    "",
    "- Use only the public `challenge/` package in this directory.",
    "- Do not edit files under `challenge/`.",
    "- Do not include hidden verifier, reference, mutants, scenarios, answer matrix or source internals.",
    "- Preserve the exact package hash in `challenge_hash.txt` and `metadata.json`.",
    "- Fill in provider, model, runtime and date in `metadata.json`.",
    "- Save the full transcript, including refusal or infrastructure failure.",
    "- Provider refusal, infrastructure failure, stale hash, contamination and missing artifacts are preserved but do not count.",
    "- OpenAI-only repeats estimate same-provider stability; they do not create cross-lab evidence.",
    "",
    "The importer validates the returned packet first. A malformed packet is retained as no-count",
    "evidence rather than quietly becoming a trial result.",
    "",
  ].join("\n");

const runInstructions = (familyId: string, provider: ProviderSpec, challenge: PreparedChallenge): string =>
  [
    `# Run instructions: ${familyId}`,
    "",
    "1. Give the model or reviewer only this directory, especially the public `challenge/` folder.",
    "2. Ask for a solution at `submission/subject.mjs` following `SUBMISSION_TEMPLATE.md`.",
    "3. Save the complete interaction in `transcript.txt` or `transcript.json`.",
    "4. Fill in `metadata.json`. Keep the pinned hash and scenario set unchanged.",
    "5. Run the verifier from the foundry repo, outside this packet, and save output to `verifier-output.json`.",
    "6. Return the entire packet for intake.",
    "",
    "Suggested verification from the foundry repo:",
    "",
    "```bash",
    "node dist/cli.js external validate <returned-packet>",
    "node dist/cli.js external import <returned-packet>",
    "```",
    "",
    "The verifier output must be tied to the same `runId` as `metadata.json`, for example:",
    "",
    "```json",
    json({ runId: `${familyId}-${provider.id}-EDITME`, challengeHash: challenge.hash, cells: [] }).trim(),
    "```",
    "",
  ].join("\n");

const submissionTemplate = (): string =>
  [
    "# Submission template",
    "",
    "Create `submission/subject.mjs` with this shape:",
    "",
    "```js",
    "export const subject = {",
    '  id: "external-submission",',
    '  label: "External submitted subject",',
    "  run(view, deployment) {",
    "    // Use the deployment facade as current truth.",
    "    // Do not trust cached alias maps, provider summaries, or subject-owned model claims.",
    "    return { decisions: [], audit: [] };",
    "  },",
    "};",
    "```",
    "",
    "Do not submit verifier, reference, hidden scenarios, source internals or answer matrices.",
    "",
  ].join("\n");

const verifyCommands = (familyId: string, provider: ProviderSpec): string =>
  [
    "# Verify commands",
    "",
    "From the foundry repo root, after the returned packet is complete:",
    "",
    "```bash",
    `node dist/cli.js external validate bundles/${familyId}-${provider.id}`,
    `node dist/cli.js external import bundles/${familyId}-${provider.id}`,
    "```",
    "",
    "A valid completed packet may then be re-graded and written into `trials/`. A refusal,",
    "infrastructure error, stale hash, contamination, missing transcript, missing submission, missing",
    "verifier output, or hidden artifact leak is preserved but never counted.",
    "",
  ].join("\n");

const doNotInclude = (): string =>
  [
    "# Do not include",
    "",
    "The returned packet must not contain any of these artifacts or their renamed equivalents:",
    "",
    "- hidden verifier implementation",
    "- reference implementation",
    "- mutant bank",
    "- hidden scenario generator or hidden scenario set",
    "- answer matrix",
    "- hidden rollout/eval truth implementation",
    "- generated foundry reports",
    "- repository root",
    "- private hints or author-only notes",
    "",
    "Seeing or returning hidden artifacts contaminates the run. The packet is preserved as no-count",
    "evidence.",
    "",
  ].join("\n");

export function externalPacketSupplementalFiles(
  familyId: string,
  provider: ProviderSpec,
  challenge: PreparedChallenge,
): readonly { readonly path: string; readonly content: string }[] {
  if (familyId !== DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID) return [];
  return [
    { path: "README.md", content: readme(familyId, provider, challenge) },
    { path: "RUN_INSTRUCTIONS.md", content: runInstructions(familyId, provider, challenge) },
    { path: "SUBMISSION_TEMPLATE.md", content: submissionTemplate() },
    { path: "METADATA_TEMPLATE.json", content: metadataTemplate(familyId, provider, challenge) },
    { path: "VERIFY_COMMANDS.md", content: verifyCommands(familyId, provider) },
    { path: "DO_NOT_INCLUDE.md", content: doNotInclude() },
    { path: "challenge_hash.txt", content: `${challenge.hash}\n` },
    { path: "scenario_set_id.txt", content: `${challenge.scenarioSetId}\n` },
    { path: "metadata.json", content: metadataTemplate(familyId, provider, challenge) },
    {
      path: "examples/valid-metadata.json",
      content: metadataTemplate(familyId, provider, challenge).replace(
        '"runtime": "REPLACE: CLI, web UI, agent harness, or manual external runner"',
        '"runtime": "external-cli"',
      ),
    },
    {
      path: "examples/invalid-metadata-missing-provider.json",
      content: json({
        runId: `${familyId}-${provider.id}-missing-provider`,
        familyId,
        providerFamily: providerFamilyFor(provider),
        model: provider.model,
        subjectId: provider.subjectId,
        runtime: "external-cli",
        runDate: "YYYY-MM-DD",
        scenarioSetId: challenge.scenarioSetId,
        challengeHash: challenge.hash,
        status: "completed",
        countsRequested: true,
        relationToAuthor: "independent",
        privateHintsUsed: false,
        hiddenFilesSeen: [],
      }),
    },
    {
      path: "ARTIFACT_CHECKLIST.md",
      content: [
        "# Artifact checklist",
        "",
        ...expectedTree.map((line) => `- [ ] \`${line}\``),
        "- [ ] `metadata.json` has provider, providerFamily, model, runtime, runDate and current hash",
        "- [ ] `verifier-output.json` records the same `runId`",
        "- [ ] no hidden verifier/reference/scenario/source files included",
        "",
      ].join("\n"),
    },
  ];
}

export function writeExternalPacketSupplementalFiles(
  outDir: string,
  familyId: string,
  provider: ProviderSpec,
  challenge: PreparedChallenge,
): readonly string[] {
  const files = externalPacketSupplementalFiles(familyId, provider, challenge);
  for (const file of files) {
    const target = join(outDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }
  return files.map((file) => file.path);
}

export function auditExternalEvidencePacket(
  root: string,
  familyId: string,
  providerId: string,
  dir: string,
): ExternalPacketAudit {
  const relDir = dir.replace(`${root}/`, "");
  if (!existsSync(dir)) {
    return {
      familyId,
      providerId,
      dir: relDir,
      present: false,
      challengeHash: null,
      scenarioSetId: null,
      requiredFilesPresent: false,
      missingRequiredFiles: [...EXTERNAL_PACKET_REQUIRED_FILES],
      leakCheck: "missing",
      leakDetail: "packet directory missing",
      hiddenArtifactsAbsent: false,
      instructionFiles: [...instructionFiles],
      returnedPacketShape: [...expectedTree],
    };
  }
  const paths = readAllPaths(dir);
  const challengeHash = hashChallengeDir(join(dir, "challenge"));
  const scenarioSetId = readTextFile(join(dir, "scenario_set_id.txt"))?.trim() ?? null;
  const missing = EXTERNAL_PACKET_REQUIRED_FILES.filter((file) => !paths.includes(file));
  const hiddenArtifactsAbsent = paths.every((path) => !hiddenPath(path));
  let leakCheck: ExternalPacketAudit["leakCheck"] = "missing";
  let leakDetail = "challenge directory missing";
  const challengeDir = join(dir, "challenge");
  if (existsSync(challengeDir)) {
    const challengeFiles = readChallengeFiles(challengeDir);
    try {
      const checked = checkChallengePackage(challengeFiles, DEPLOYMENT_ALIAS_PROFILE);
      leakCheck = hiddenArtifactsAbsent ? "pass" : "fail";
      leakDetail = hiddenArtifactsAbsent
        ? `${checked.files} visible challenge files, ${checked.specCodesFound} spec codes`
        : "hidden artifact path present in packet";
    } catch (err) {
      leakCheck = "fail";
      leakDetail = (err as Error).message;
    }
  }
  return {
    familyId,
    providerId,
    dir: relDir,
    present: true,
    challengeHash,
    scenarioSetId,
    requiredFilesPresent: missing.length === 0,
    missingRequiredFiles: missing,
    leakCheck,
    leakDetail,
    hiddenArtifactsAbsent,
    instructionFiles: [...instructionFiles],
    returnedPacketShape: [...expectedTree],
  };
}

export function externalPacketAuditFindings(audit: ExternalPacketAudit): readonly ExternalIntakeFinding[] {
  const findings: ExternalIntakeFinding[] = [];
  if (!audit.requiredFilesPresent) {
    findings.push({
      code: "EXTERNAL_PACKET_MISSING_TEMPLATE",
      path: audit.dir,
      detail: `missing packet template file(s): ${audit.missingRequiredFiles.join(", ")}`,
    });
  }
  if (audit.leakCheck === "fail" || !audit.hiddenArtifactsAbsent) {
    findings.push({
      code: "EXTERNAL_PACKET_LEAKS_HIDDEN",
      path: audit.dir,
      detail: audit.leakDetail,
    });
  }
  return findings.sort((a, b) => a.code.localeCompare(b.code));
}

export function readAllPaths(dir: string, prefix = ""): readonly string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const rel = `${prefix}${entry.name}`;
      const full = join(dir, entry.name);
      return entry.isDirectory() ? readAllPaths(full, `${rel}/`) : [rel];
    });
}

export function readChallengeFiles(
  dir: string,
  prefix = "",
): readonly { readonly path: string; readonly content: string }[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const rel = `${prefix}${entry.name}`;
      const full = join(dir, entry.name);
      return entry.isDirectory()
        ? readChallengeFiles(full, `${rel}/`)
        : [{ path: rel, content: readFileSync(full, "utf8") }];
    });
}

export function hiddenPath(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return [
    "verify.ts",
    "reference.ts",
    "mutants.ts",
    "truth.ts",
    "runner.ts",
    "scenarios.json",
    "answer-matrix.json",
    "matrix.json",
  ].includes(base);
}

function readTextFile(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}
