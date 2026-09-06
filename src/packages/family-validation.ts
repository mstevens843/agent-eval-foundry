import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SECURELY_MIGRATED_FAMILIES } from "../trials/secure-runner.js";
import { type AssuranceOperation, assertAssuranceCoverage, runAssurance } from "./assurance.js";
import { decidePackage } from "./policy.js";
import { type PackageSnapshot, refreshSnapshot, sha256 } from "./record.js";

export const FAMILY_LOCAL_CONTROLS = [
  "reference",
  "alternative",
  "positive-work",
  "near-miss",
  "private-boundary",
  "protocol",
  "repeatability",
  "exact-coverage",
] as const;

/** Local controls reuse the common evidence machinery, not a second readiness policy. The caller
 * supplies real executable checks; author confidence, a missing operation or record-check metadata
 * cannot qualify as execution. Bounded expert time and provider evidence remain separately pending. */
export async function validateFamilyControls(
  root: string,
  snapshot: PackageSnapshot,
  operations: readonly AssuranceOperation[],
  review: {
    contractReviewed: boolean;
    unresolvedAmbiguities: number;
    unrepairedBypasses: number;
  },
) {
  refreshSnapshot(snapshot);
  if (!SECURELY_MIGRATED_FAMILIES.includes(snapshot.record.familyId)) throw Error("FAMILY_ROUTE_UNPROTECTED");
  if (
    operations.length !== FAMILY_LOCAL_CONTROLS.length ||
    FAMILY_LOCAL_CONTROLS.some((id) => !operations.some((op) => op.id === id)) ||
    operations.some((op) => op.evidenceClass !== "local-execution" || op.route !== "cell-container")
  )
    throw Error("FAMILY_CONTROL_COVERAGE");
  const files = snapshot.record.components.collector.files;
  if (!files.some((f) => f.path === "dist/trials/operation-authority.js"))
    throw Error("FAMILY_BUNDLE_UNBOUND");
  for (const file of files)
    if (sha256(readFileSync(join(root, file.path))) !== file.sha256)
      throw Error(`FAMILY_COLLECTOR_CHANGED: ${file.path}`);
  const results = await runAssurance(snapshot, operations);
  assertAssuranceCoverage(snapshot, results, operations);
  const decision = decidePackage({
    snapshot,
    expectedFamilyId: snapshot.record.familyId,
    checks: {
      reference: true,
      positiveWork: true,
      nearMissControls: true,
      contractReviewed: review.contractReviewed,
      protectedGrading: true,
      localIntegrityControls: true,
      // These claims are not established by executing this finite local control bank.
      boundedSolveEvidence: false,
      destinationChecks: false,
      publicPackageComplete: false,
      unresolvedAmbiguities: review.unresolvedAmbiguities,
      unrepairedBypasses: review.unrepairedBypasses,
    },
  });
  return { results, decision };
}
