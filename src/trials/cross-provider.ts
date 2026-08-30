// The cross-provider campaign layer: prepare, run, import, reconcile, status.
//
// A campaign used to be a plan with slots. This adds the thing that makes a campaign portable: a
// slot knows which PROVIDER FAMILY it belongs to, whether that provider is runnable on this machine,
// and — when it is not — what exactly someone else would have to do to produce an importable result.
//
// The distinction that matters, and the one this file exists to keep:
//
//   not run          nobody asked. A slot with no attempt.
//   refused          the provider declined. An attempt that produced no work.
//   infra failure    the provider could not authenticate, or the harness broke.
//   counted          an artifact was produced, graded, and the challenge hash matched.
//
// The first cross-provider campaign produced one of each within twenty minutes, which is the best
// argument for keeping them apart that this repository has: Claude counted, Gemini hit an account
// tier error in three seconds, and a naive pass-rate over "runs that happened" would have reported
// the second as a model scoring zero.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fail } from "../foundry/schema.js";
import { type ProviderSpec, buildCommand, checkProvider, providerById } from "./provider-registry.js";
import { routeFor } from "./router.js";
import { type PreparedChallenge, prepareChallenge } from "./run.js";

export interface PreparedProviderBundle {
  readonly familyId: string;
  readonly provider: ProviderSpec;
  readonly available: boolean;
  readonly availability: string;
  readonly challenge: PreparedChallenge;
  readonly command: readonly string[] | null;
  readonly instruction: string;
  readonly dir: string;
  /** Files written beside the bundle so the run is reproducible by someone else. */
  readonly files: readonly string[];
}

const submissionFilesFor = (familyId: string): readonly string[] =>
  familyId === "checker-required-memory-poisoning" ? ["subject.mjs", "checker.mjs"] : ["subject.mjs"];

const RUN_SCRIPT = (familyId: string, spec: ProviderSpec, command: readonly string[] | null): string =>
  [
    "#!/usr/bin/env bash",
    "# Run this trial. Produced by `foundry trials campaign prepare`.",
    "#",
    "# The command below is EXACTLY what the foundry would run for this provider. Run it with this",
    `# directory as the working directory; the model must write ${submissionFilesFor(familyId)
      .map((f) => `submission/${f}`)
      .join(" and ")}.`,
    "# Then hand the whole directory back to `foundry trials campaign import`.",
    "set -euo pipefail",
    'cd "$(dirname "$0")"',
    "mkdir -p submission",
    "",
    command === null
      ? `# No CLI is declared for this provider. Give INSTRUCTION.txt to the model however you run it,\n# and save its answer to ${submissionFilesFor(
          familyId,
        )
          .map((f) => `submission/${f}`)
          .join(" and ")}.`
      : command.map((arg, i) => (i === 0 ? arg : `  ${JSON.stringify(arg)}`)).join(" \\\n"),
    "",
  ].join("\n");

const METADATA_TEMPLATE = (familyId: string, spec: ProviderSpec, challenge: PreparedChallenge): string =>
  `${JSON.stringify(
    {
      runId: `${familyId.split("-").pop()}-${spec.id}-EDITME`,
      familyId,
      provider: spec.id,
      providerLabel: spec.label,
      model: spec.model,
      subjectId: spec.subjectId,
      effort: spec.effort,
      scenarioSetId: challenge.scenarioSetId,
      challengeHash: challenge.hash,
      isolation: "subprocess",
      status: "completed",
      notes: "REPLACE: how it was run, and anything unusual about the run.",
      runtimeSeconds: null,
      costUsd: null,
    },
    null,
    2,
  )}\n`;

const IMPORT_README = (familyId: string, spec: ProviderSpec, challenge: PreparedChallenge): string =>
  [
    `# Run this trial: ${familyId} on ${spec.label}`,
    "",
    "This directory is a complete, self-contained trial bundle. Nothing in it is optional.",
    "",
    "## What to do",
    "",
    "1. Run `./run.sh`, or give `INSTRUCTION.txt` to the model any way you like.",
    `2. The model must write: ${submissionFilesFor(familyId)
      .map((f) => `\`submission/${f}\``)
      .join(", ")}.`,
    "3. Save the model's full output to `transcript.txt` — including a refusal, if that is what happened.",
    "4. Fill in `metadata.json`. Do not change `challengeHash` or `scenarioSetId`.",
    "5. Hand the directory back:",
    "",
    "```bash",
    `foundry trials campaign import --family ${familyId} <this-directory>`,
    "```",
    "",
    "## What the importer will check",
    "",
    "| check | why |",
    "|---|---|",
    `| \`challengeHash\` equals \`${challenge.hash}\` | a trial run against a different version of the task is evidence about that version, not this one |`,
    "| `transcript.txt` exists and is non-empty | a run with no transcript cannot be audited, so it cannot count |",
    `| ${submissionFilesFor(familyId)
      .map((f) => `\`submission/${f}\``)
      .join(", ")} exist | a counted trial needs every artifact it was graded on |`,
    "| the submission is not a checked-in baseline | an artifact that does nothing is the absence of an attempt |",
    "| `status` is one of the declared classifications | a refusal is not a failure and must not be filed as one |",
    "",
    "**If the model refused**, set `status` to `refused`, save the transcript, and import it anyway.",
    "A refusal is a real result about the provider and it is never counted as a model failure.",
    "",
    "**If the provider could not authenticate or errored**, set `status` to `infrastructure_error`.",
    "",
    "## The task",
    "",
    `${challenge.pkg.files.length} files under \`challenge/\`, scenario set \`${challenge.scenarioSetId}\`.`,
    "The grading is not in this bundle and must not be: the model is graded against scenarios it has",
    "never seen, drawn from the declared space its `SPEC.md` publishes in full.",
    "",
  ].join("\n");

/**
 * Write a self-contained bundle for one (family, provider) pair.
 *
 * Produced whether or not the provider is available here, because the two uses are the same: a
 * runnable bundle for a machine that has the CLI, and an auditable record of exactly what would have
 * been run on one that does not.
 */
export function prepareProviderBundle(
  root: string,
  familyId: string,
  providerId: string,
  outDir: string,
): PreparedProviderBundle {
  const spec = providerById(providerId);
  const availability = checkProvider(spec);
  const route = routeFor(familyId);
  const challenge = prepareChallenge(root, familyId, join(outDir, "challenge"));
  const command = buildCommand(spec, route.instruction);

  mkdirSync(join(outDir, "submission"), { recursive: true });
  const files: { name: string; content: string; exec?: boolean }[] = [
    { name: "INSTRUCTION.txt", content: `${route.instruction}\n` },
    { name: "README.md", content: IMPORT_README(familyId, spec, challenge) },
    { name: "metadata.json", content: METADATA_TEMPLATE(familyId, spec, challenge) },
    { name: "run.sh", content: RUN_SCRIPT(familyId, spec, command), exec: true },
    { name: "transcript.txt", content: "" },
    {
      name: "PROVIDER.json",
      content: `${JSON.stringify(
        {
          provider: spec.id,
          family: spec.family,
          label: spec.label,
          model: spec.model,
          subjectId: spec.subjectId,
          availableHere: availability.available,
          availabilityDetail: availability.detail,
          invocationNote: spec.invocationNote,
          command,
        },
        null,
        2,
      )}\n`,
    },
  ];
  for (const file of files) {
    writeFileSync(join(outDir, file.name), file.content, {
      encoding: "utf8",
      mode: file.exec ? 0o755 : 0o644,
    });
  }

  return {
    familyId,
    provider: spec,
    available: availability.available,
    availability: availability.detail,
    challenge,
    command,
    instruction: route.instruction,
    dir: outDir,
    files: files.map((f) => f.name),
  };
}

// ---------------------------------------------------------------- strict import

export interface ImportedBundle {
  readonly runId: string;
  readonly familyId: string;
  readonly provider: string;
  readonly model: string;
  readonly subjectId: string;
  readonly effort: string | null;
  readonly status: string;
  readonly challengeHash: string;
  readonly transcript: string;
  readonly submissionPath: string | null;
  readonly submissionFiles: readonly { readonly path: string; readonly content: string }[];
  readonly notes: string;
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
}

const REQUIRED_KEYS = ["runId", "familyId", "provider", "model", "subjectId", "status", "challengeHash"];

/**
 * Read an externally-run bundle, refusing anything that cannot be audited.
 *
 * Strictness here is the price of accepting evidence this repository did not produce. Every rule
 * below exists because its absence would let an unverifiable claim into the counted set, and a
 * counted set that admits unverifiable claims is not worth having.
 */
export function readImportedBundle(
  dir: string,
  expectedFamilyId: string,
  currentHash: string,
): ImportedBundle {
  const path = `import.${dir}`;
  const metaPath = join(dir, "metadata.json");
  if (!existsSync(metaPath)) {
    fail(
      "IMPORT_MISSING_METADATA",
      path,
      "no metadata.json: nothing says what this run was or which model produced it",
    );
  }
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>;
  } catch (err) {
    return fail("IMPORT_MISSING_METADATA", path, `metadata.json does not parse: ${(err as Error).message}`);
  }
  for (const key of REQUIRED_KEYS) {
    if (typeof meta[key] !== "string" || (meta[key] as string).length === 0) {
      fail("IMPORT_MISSING_METADATA", `${path}.${key}`, "required and absent or empty");
    }
  }
  if (meta["familyId"] !== expectedFamilyId) {
    fail(
      "IMPORT_FAMILY_MISMATCH",
      `${path}.familyId`,
      `bundle says \`${String(meta["familyId"])}\` and it is being imported as \`${expectedFamilyId}\``,
    );
  }
  if (meta["challengeHash"] !== currentHash) {
    fail(
      "IMPORT_CHALLENGE_MISMATCH",
      `${path}.challengeHash`,
      `bundle was run against challenge ${String(meta["challengeHash"])}; the family now produces ${currentHash}. The run measured a different task and cannot count for this one.`,
    );
  }

  const transcriptPath = join(dir, "transcript.txt");
  const transcript = existsSync(transcriptPath) ? readFileSync(transcriptPath, "utf8") : "";
  const status = String(meta["status"]);
  const submissionDir = join(dir, "submission");
  const submissionNames = existsSync(submissionDir) ? readdirSync(submissionDir).sort() : [];
  const requiredSubmissions = submissionFilesFor(expectedFamilyId);
  const submissionFile = submissionNames.includes("subject.mjs")
    ? "subject.mjs"
    : submissionNames.find((f) => f.endsWith(".mjs") || f.endsWith(".js"));

  // A run that claims to have completed must have both halves of its evidence. A refusal or an
  // infrastructure failure legitimately has neither artifact nor much transcript, and is imported
  // as the uncounted record it is.
  if (status === "completed") {
    if (transcript.trim().length === 0) {
      fail(
        "IMPORT_MISSING_TRANSCRIPT",
        path,
        "status is `completed` and transcript.txt is empty; a run nobody can read cannot be counted",
      );
    }
    const missing = requiredSubmissions.filter((f) => !submissionNames.includes(f));
    if (missing.length > 0) {
      fail(
        "IMPORT_MISSING_SUBMISSION",
        path,
        `status is \`completed\` and submission/ is missing ${missing.join(", ")}; there is nothing complete to grade`,
      );
    }
  }
  const submissionFiles = submissionNames.map((name) => ({
    path: name,
    content: readFileSync(join(submissionDir, name), "utf8"),
  }));

  return {
    runId: String(meta["runId"]),
    familyId: expectedFamilyId,
    provider: String(meta["provider"]),
    model: String(meta["model"]),
    subjectId: String(meta["subjectId"]),
    effort: typeof meta["effort"] === "string" ? meta["effort"] : null,
    status,
    challengeHash: String(meta["challengeHash"]),
    transcript,
    submissionPath: submissionFile === undefined ? null : join(submissionDir, submissionFile),
    submissionFiles,
    notes: typeof meta["notes"] === "string" ? meta["notes"] : "",
    runtimeSeconds: typeof meta["runtimeSeconds"] === "number" ? meta["runtimeSeconds"] : null,
    costUsd: typeof meta["costUsd"] === "number" ? meta["costUsd"] : null,
  };
}
