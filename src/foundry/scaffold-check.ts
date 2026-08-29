// The scaffold checker. It does not import the generator, on purpose.
//
// A checker that shares code with the thing it checks verifies that the code ran, not that the
// result is right. So this file re-declares the artifact list independently. If someone adds an
// artifact to the generator and not here, the coverage test fails; if someone removes one from the
// generator, the check fails. The duplication is the mechanism, not an oversight, and there is a
// test asserting the two lists agree.
//
// It also enforces a minimum body size per artifact. That rule exists because the failure mode for a
// generator like this is not a missing file, it is a file containing a heading and nothing else --
// which passes an existence check and tells the author nothing. A scaffold that emits eight empty
// documents is worse than one that emits none, because it looks finished.

import { fail } from "./schema.js";

/** Independently declared. Do not import this from the generator, or the check becomes circular. */
export const EXPECTED_ARTIFACTS = [
  "family.json",
  "instruction.draft.md",
  "hidden-test-plan.md",
  "reference-checklist.md",
  "mutant-plan.md",
  "fairness-checklist.md",
  "cheat-resistance-checklist.md",
  "README.md",
] as const;

/** Below this, a document is a heading with nothing under it. Chosen to be obviously too small. */
export const MIN_ARTIFACT_BYTES = 200;

export interface CheckableFile {
  readonly path: string;
  readonly content: string;
}

export interface ScaffoldCheckResult {
  readonly familyId: string;
  readonly artifacts: readonly { readonly path: string; readonly bytes: number }[];
  readonly totalBytes: number;
}

/**
 * Grade a generated scaffold.
 *
 * `expectFamilyId` is compared against the metadata the scaffold carries: a folder whose
 * `family.json` disagrees with the folder it was written into is the kind of drift that silently
 * detaches a scaffold from the ledger row that justified it.
 */
export function checkScaffold(files: readonly CheckableFile[], expectFamilyId: string): ScaffoldCheckResult {
  const byPath = new Map(files.map((f) => [f.path, f.content]));

  for (const required of EXPECTED_ARTIFACTS) {
    const content = byPath.get(required);
    if (content === undefined) {
      fail(
        "SCAFFOLD_MISSING_ARTIFACT",
        `scaffold/${required}`,
        "required artifact is absent; the generator must not emit a folder that skips a gate",
      );
    }
    if (content.trim().length < MIN_ARTIFACT_BYTES) {
      fail(
        "SCAFFOLD_EMPTY_ARTIFACT",
        `scaffold/${required}`,
        `only ${content.trim().length} bytes of content; an artifact this thin looks finished and says nothing (minimum ${MIN_ARTIFACT_BYTES})`,
      );
    }
  }

  const metaRaw = byPath.get("family.json") ?? "";
  let meta: unknown;
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return fail("SCAFFOLD_METADATA_MISMATCH", "scaffold/family.json", "is not valid JSON");
  }
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
    fail("SCAFFOLD_METADATA_MISMATCH", "scaffold/family.json", "expected an object");
  }
  const m = meta as Record<string, unknown>;
  if (m["familyId"] !== expectFamilyId) {
    fail(
      "SCAFFOLD_METADATA_MISMATCH",
      "scaffold/family.json",
      `declares familyId "${String(m["familyId"])}" but was generated for "${expectFamilyId}"`,
    );
  }
  const declared = Array.isArray(m["artifacts"]) ? m["artifacts"].map(String) : [];
  const missingFromMetadata = EXPECTED_ARTIFACTS.filter((a) => !declared.includes(a));
  if (missingFromMetadata.length > 0) {
    fail(
      "SCAFFOLD_METADATA_MISMATCH",
      "scaffold/family.json",
      `metadata.artifacts omits ${missingFromMetadata.join(", ")}, so the manifest disagrees with what was written`,
    );
  }

  const artifacts = EXPECTED_ARTIFACTS.map((path) => ({
    path,
    bytes: (byPath.get(path) ?? "").length,
  }));
  return {
    familyId: expectFamilyId,
    artifacts,
    totalBytes: artifacts.reduce((n, a) => n + a.bytes, 0),
  };
}
