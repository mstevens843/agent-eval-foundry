import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { checkChallengePackage } from "../challenge/package-check.js";
import type { ChallengeManifest, ChallengePackage } from "../challenge/package.js";
import { BUILT_FAMILY_IDS, builtFamily } from "../families/registry.js";
import type { HumanReadinessAudit, HumanReadinessCheck } from "./types.js";

/**
 * Families audited here that are NOT built families, with why they belong anyway.
 *
 * `durable-approval-outbox` is the imported historical bank: it has trials and a ledger row in this
 * repository but no executable family, so the audit is expected to say `not-ready` and that verdict
 * is the point — it is the control that proves this audit can fail.
 */
export const HUMAN_AUDIT_NON_BUILT_FAMILIES: readonly string[] = ["durable-approval-outbox"];

/**
 * DERIVED from the built-family registry, never typed out.
 *
 * The hand-written version of this list carried eight ids and looked complete. It was not: it named
 * `durable-approval-outbox` and omitted `access-token-scope-expansion`, which has a checked-in
 * challenge package and had simply never been added here. Nothing compared the list to the registry,
 * so the family was silently unaudited for human solvability while the report read as full coverage.
 *
 * There is no exclusion list on purpose. Auditing a built family costs one package read, so "we did
 * not get to it" is never a reason to leave one out; if a built family's package is incomplete the
 * audit is supposed to say so out loud. See `test/family-list-drift.test.ts`.
 */
export const humanAuditedFamilies = (
  builtFamilyIds: readonly string[] = BUILT_FAMILY_IDS,
): readonly string[] => [...builtFamilyIds, ...HUMAN_AUDIT_NON_BUILT_FAMILIES].sort();

export const HUMAN_AUDITED_FAMILIES: readonly string[] = humanAuditedFamilies();

const pass = (id: string, detail: string): HumanReadinessCheck => ({ id, verdict: "pass", detail });
const failCheck = (id: string, detail: string): HumanReadinessCheck => ({ id, verdict: "fail", detail });

const textFor = (pkg: ChallengePackage): string =>
  pkg.files.map((f) => `\n--- ${f.path} ---\n${f.content.toLowerCase()}`).join("\n");

const hasAny = (text: string, needles: readonly string[]): boolean => needles.some((n) => text.includes(n));

const hiddenSamplingVisible = (text: string): boolean =>
  text.includes("hidden") &&
  hasAny(text, ["sample", "drawn from", "same declared", "declared space"]) &&
  hasAny(text, [
    "add no rule",
    "adds no rule",
    "add no hidden rule",
    "do not add hidden rules",
    "adds no new kind",
    "add no new policy rule",
  ]);

function readChallengeFiles(dir: string) {
  const files: { path: string; content: string }[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const next = join(current, entry.name);
      if (entry.isDirectory()) walk(next, `${prefix}${entry.name}/`);
      else files.push({ path: `${prefix}${entry.name}`, content: readFileSync(next, "utf8") });
    }
  };
  walk(dir, "");
  return files;
}

function hashFiles(files: readonly { readonly path: string; readonly content: string }[]): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 32);
}

function challengeFor(root: string, familyId: string) {
  if (!BUILT_FAMILY_IDS.includes(familyId)) return null;
  const dir = join(root, "examples", "families", familyId, "challenge");
  if (!existsSync(dir)) return null;
  const family = builtFamily(familyId);
  const files = readChallengeFiles(dir);
  const manifestFile = files.find((f) => f.path === "MANIFEST.json");
  if (manifestFile === undefined) return null;
  const pkg: ChallengePackage = {
    familyId,
    files,
    manifest: JSON.parse(manifestFile.content) as ChallengeManifest,
  };
  const check = checkChallengePackage(pkg.files, family.leakProfile);
  return { family, pkg, check, hash: hashFiles(pkg.files) };
}

export function auditHumanReadiness(root: string, familyId: string): HumanReadinessAudit {
  const built = challengeFor(root, familyId);
  if (built === null) {
    const checks = [
      failCheck(
        "public-package-present",
        "no generated challenge package is checked by this repository for this imported or unbuilt family",
      ),
      failCheck("surface-complete", "README.md, SPEC.md, types/API and manifest are not available here"),
      failCheck("spec-rules-complete", "no visible SPEC.md was audited in this repository"),
      failCheck("hidden-sampling-visible", "hidden coverage cannot be audited without a public package"),
      failCheck(
        "allowed-assumptions-visible",
        "allowed assumptions cannot be audited without a public package",
      ),
      failCheck(
        "forbidden-assumptions-visible",
        "forbidden assumptions cannot be audited without a public package",
      ),
      failCheck("examples-present", "no visible examples are available here"),
      failCheck("scoring-contract-visible", "no public scoring contract is available here"),
      failCheck("hidden-artifacts-absent", "no generated package split was checked here"),
      failCheck("solvable-without-source-internals", "a human would need source or external context"),
    ];
    return {
      familyId,
      packageAvailable: false,
      packageHash: null,
      visibleFiles: [],
      verdict: "not-ready",
      checks,
    };
  }

  const pkg = built.pkg;
  const text = textFor(pkg);
  const visibleFiles = pkg.files.map((f) => f.path).sort();
  const requiredSurface = ["README.md", "SPEC.md", "types.ts", "MANIFEST.json"];
  const hasSurface = requiredSurface.every((p) => visibleFiles.includes(p));
  const hasStarter = visibleFiles.some((p) => p.startsWith("starter/") && p.endsWith(".mjs"));
  const examples = built.check.examples;
  const scoringVisible = hasAny(text, ["how you are graded", "graded on:", "hidden grader"]);
  const allowedVisible = hasAny(text, [
    "nothing outside",
    "exactly these ways",
    "declared space",
    "same declared space",
  ]);
  const forbiddenVisible = hasAny(text, ["must not", "forbidden", "illegal outcomes", "fails"]);
  const hiddenSampling = hiddenSamplingVisible(text);

  const checks: readonly HumanReadinessCheck[] = [
    pass("public-package-present", `checked-in public package hashes to ${built.hash}`),
    hasSurface && hasStarter
      ? pass(
          "surface-complete",
          `${visibleFiles.length} visible file(s), including README, SPEC, API and starter`,
        )
      : failCheck("surface-complete", "missing README, SPEC, API, manifest or starter artifact"),
    built.check.specCodesFound === built.family.leakProfile.requiredSpecCodes.length
      ? pass("spec-rules-complete", `${built.check.specCodesFound} visible rule code(s) in SPEC.md`)
      : failCheck("spec-rules-complete", "not every hidden verifier rule code appears in SPEC.md"),
    hiddenSampling
      ? pass("hidden-sampling-visible", "hidden coverage is described as sampling the public declared space")
      : failCheck("hidden-sampling-visible", "public package does not clearly say hidden cases add no rules"),
    allowedVisible
      ? pass("allowed-assumptions-visible", "declared-space or nothing-outside language is visible")
      : failCheck("allowed-assumptions-visible", "allowed assumptions are not stated explicitly enough"),
    forbiddenVisible
      ? pass("forbidden-assumptions-visible", "must-not/fails/illegal language is visible")
      : failCheck("forbidden-assumptions-visible", "forbidden assumptions are not stated explicitly enough"),
    examples > 0
      ? pass("examples-present", `${examples} visible example file(s)`)
      : failCheck("examples-present", "no examples"),
    scoringVisible
      ? pass("scoring-contract-visible", "public README/SPEC states how grading works")
      : failCheck("scoring-contract-visible", "no public scoring contract found"),
    pass("hidden-artifacts-absent", "challenge package passed the independent leak checker"),
    hasSurface && examples > 0 && scoringVisible && hiddenSampling
      ? pass(
          "solvable-without-source-internals",
          "public package contains the contract needed for a clean-room attempt",
        )
      : failCheck("solvable-without-source-internals", "a solver would need hidden source or author context"),
  ];
  return {
    familyId,
    packageAvailable: true,
    packageHash: built.hash,
    visibleFiles,
    verdict: checks.every((c) => c.verdict === "pass") ? "human-ready" : "not-ready",
    checks,
  };
}

export function auditHumanReadinessForFamilies(
  root: string,
  familyIds: readonly string[] = HUMAN_AUDITED_FAMILIES,
): readonly HumanReadinessAudit[] {
  return familyIds
    .map((id) => auditHumanReadiness(root, id))
    .sort((a, b) => a.familyId.localeCompare(b.familyId));
}
