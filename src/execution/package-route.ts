import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { copySnapshot, inspectAssembly, materializeAssembly } from "../packages/assembly.js";
import { runNativeCaaSubmission } from "../packages/native-caa.js";
import { runPortfolioSubmission } from "../packages/portfolio.js";
import {
  type PackageSnapshot,
  canonicalJson,
  readSnapshotFile,
  refreshSnapshot,
  resolvePackage,
} from "../packages/record.js";
import { type EvaluationOutcome, evaluateOutcome } from "../trials/outcome.js";
import { regularTree } from "./artifacts.js";

export interface ExecutionPackage {
  directory: string;
  snapshot: PackageSnapshot;
  native: boolean;
  route: string;
  image: string;
  scenarioIds: string[];
  checkIds: string[];
}
export function executionPackage(directory: string): ExecutionPackage {
  const pointer = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as {
    packageDigest: string;
  };
  const snapshot = resolvePackage(join(directory, "store"), pointer.packageDigest);
  const native = snapshot.record.id === "caa-revalidation-repair";
  const runtime = JSON.parse(
    Buffer.from(readSnapshotFile(snapshot, "dependencies", "runtime.json")).toString(),
  );
  const manifest = native
    ? JSON.parse(Buffer.from(readSnapshotFile(snapshot, "scenarios", "native-manifest.json")).toString())
    : null;
  inspectAssembly(snapshot);
  return {
    directory,
    snapshot,
    native,
    route: native ? "native-caa-separate-verifier@1" : "professional-multifile/authority-process@1",
    image: native ? runtime.images.environment : runtime.image,
    scenarioIds: native
      ? manifest.scenarioIds
      : JSON.parse(
          Buffer.from(readSnapshotFile(snapshot, "scenarios", "private/scenarios.json")).toString(),
        ).map((s: { id: string }) => s.id),
    checkIds: native
      ? manifest.checkIds
      : JSON.parse(Buffer.from(readSnapshotFile(snapshot, "scenarios", "check-ids.json")).toString()),
  };
}
export function prepareExecutionPackage(pkg: ExecutionPackage, stage: string) {
  refreshSnapshot(pkg.snapshot);
  copySnapshot(pkg.snapshot, join(stage, "package-store"));
  materializeAssembly(pkg.snapshot, join(stage, "public"), "subject");
}
/** Known correct bytes supplied only to the inert fixture adapter, never to a real solver. */
export function simulationOverlay(pkg: ExecutionPackage, incorrect = false): Record<string, string> {
  const prefix = pkg.native ? "solution/files/" : "private/reference/";
  const files = pkg.snapshot.record.components.reference.files.filter((f) => f.path.startsWith(prefix));
  if (!files.length) throw Error(`SIMULATION_REFERENCE_LAYOUT:${pkg.snapshot.record.id}`);
  const overlay = Object.fromEntries(
    files.map((f) => [
      f.path.slice(prefix.length),
      Buffer.from(readSnapshotFile(pkg.snapshot, "reference", f.path)).toString("base64"),
    ]),
  );
  if (incorrect) {
    if (!pkg.native) throw Error("SIMULATION_INCORRECT_OVERLAY_UNSUPPORTED");
    // This retained near-miss completes the protocol but combines authorizations incorrectly.
    // The unchanged native starter can itself crash on a later order: that must stay invalid.
    const controlPrefix = "tests/mutants/any-authorizes/";
    const controls = pkg.snapshot.record.components.controls.files.filter((f) =>
      f.path.startsWith(controlPrefix),
    );
    if (!controls.length) throw Error("SIMULATION_CONTROL_LAYOUT");
    for (const f of controls)
      overlay[f.path.slice(controlPrefix.length)] = Buffer.from(
        readSnapshotFile(pkg.snapshot, "controls", f.path),
      ).toString("base64");
  }
  return overlay;
}
export async function gradeExecutionPackage(
  pkg: ExecutionPackage,
  submission: string,
  output: string,
): Promise<{ evaluation: EvaluationOutcome; reward: number | null }> {
  refreshSnapshot(pkg.snapshot);
  regularTree(submission, 8 * 1024 * 1024);
  if (pkg.native) {
    const result = await runNativeCaaSubmission(pkg.directory, submission, output);
    const raw = result.evaluation as {
      complete?: boolean;
      kind?: string;
      errors?: unknown[];
      cells?: { scenarioId: string; failures: { check: string }[] }[];
      scenarioIds?: string[];
      checkIds?: string[];
    };
    const evaluation = evaluateOutcome({
      providerStatus: "completed",
      expectedIds: pkg.scenarioIds,
      expectedCheckIds: pkg.checkIds,
      artifactPresent: true,
      hostErrors: raw.complete === true && raw.errors?.length === 0 ? 0 : 1,
      cells: raw.cells?.map((c) => ({ scenarioId: c.scenarioId, failed: c.failures.map((f) => f.check) })),
    });
    if (
      evaluation.complete &&
      (result.reward !== (evaluation.status === "semantic-pass" ? 1 : 0) ||
        raw.kind !== evaluation.status ||
        canonicalJson(raw.checkIds) !== canonicalJson(pkg.checkIds) ||
        canonicalJson(raw.scenarioIds) !== canonicalJson(pkg.scenarioIds))
    )
      throw Error("NATIVE_EVALUATION_CONFLICT");
    return { evaluation, reward: evaluation.complete ? result.reward : null };
  }
  const result = await runPortfolioSubmission(pkg.directory, submission, output);
  const evaluation = evaluateOutcome({
    providerStatus: "completed",
    expectedIds: pkg.scenarioIds,
    expectedCheckIds: pkg.checkIds,
    artifactPresent: existsSync(join(submission, "entry.mjs")),
    hostErrors: result.cells.some((c) => c.status === "invalid") ? 1 : 0,
    cells: result.cells.map((c) => ({ scenarioId: c.scenarioId, failed: c.failures ?? [] })),
  });
  return { evaluation, reward: evaluation.complete ? (evaluation.status === "semantic-pass" ? 1 : 0) : null };
}
