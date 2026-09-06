import { performance } from "node:perf_hooks";
import { type PackageSnapshot, canonicalJson, refreshSnapshot, sha256 } from "./record.js";

export type AssuranceClass =
  | "record-check"
  | "local-execution"
  | "model-standard"
  | "model-adversarial"
  | "human-review";
export interface AssuranceResult {
  readonly id: string;
  readonly packageDigest: string;
  readonly artifactDigest: string;
  readonly route: string;
  readonly evidenceClass: AssuranceClass;
  readonly status: "pass" | "fail" | "error" | "pending";
  readonly milliseconds: number;
  readonly detail: unknown;
}
export interface AssuranceOperation {
  readonly id: string;
  readonly artifactDigest: string;
  readonly route: string;
  readonly evidenceClass: "record-check" | "local-execution";
  readonly run: () => Promise<{ passed: boolean; detail: unknown }>;
}

/** Required controls are an exact set; an empty, duplicated or relabelled green list is not proof. */
export function assertAssuranceCoverage(
  snapshot: PackageSnapshot,
  results: readonly AssuranceResult[],
  required: readonly Pick<AssuranceOperation, "id" | "route" | "artifactDigest" | "evidenceClass">[],
): void {
  refreshSnapshot(snapshot);
  if (
    !required.length ||
    results.length !== required.length ||
    new Set(results.map((r) => r.id)).size !== results.length
  )
    throw new Error("ASSURANCE_INCOMPLETE");
  for (const wanted of required) {
    const actual = results.find((r) => r.id === wanted.id);
    if (
      !actual ||
      actual.status !== "pass" ||
      actual.packageDigest !== snapshot.record.digest ||
      actual.artifactDigest !== wanted.artifactDigest ||
      actual.route !== wanted.route ||
      actual.evidenceClass !== wanted.evidenceClass ||
      !Number.isFinite(actual.milliseconds) ||
      actual.milliseconds < 0
    )
      throw new Error(`ASSURANCE_BINDING: ${wanted.id}`);
  }
}

/** Author-owned deterministic checks only. Skips/throws cannot become passing controls. */
export async function runAssurance(
  snapshot: PackageSnapshot,
  operations: readonly AssuranceOperation[],
): Promise<readonly AssuranceResult[]> {
  refreshSnapshot(snapshot);
  const seen = new Set<string>();
  const out: AssuranceResult[] = [];
  for (const op of operations) {
    if (!op.id || !op.route || !/^[a-f0-9]{64}$/.test(op.artifactDigest) || seen.has(op.id))
      throw new Error("ASSURANCE_DESCRIPTOR");
    seen.add(op.id);
    const start = performance.now();
    let status: AssuranceResult["status"];
    let detail: unknown;
    try {
      refreshSnapshot(snapshot);
      const result = await op.run();
      refreshSnapshot(snapshot);
      status = result.passed === true ? "pass" : "fail";
      detail = result.detail;
    } catch (error) {
      status = "error";
      detail = { error: String(error) };
    }
    out.push({
      id: op.id,
      packageDigest: snapshot.record.digest,
      artifactDigest: op.artifactDigest,
      route: op.route,
      evidenceClass: op.evidenceClass,
      status,
      detail,
      milliseconds: performance.now() - start,
    });
  }
  return out;
}

/** Timing is observation metadata, not task identity or semantic repeatability. */
export function assuranceVerdictDigest(results: readonly AssuranceResult[]): string {
  return sha256(
    canonicalJson(
      results.map(({ id, packageDigest, artifactDigest, route, evidenceClass, status }) => ({
        id,
        packageDigest,
        artifactDigest,
        route,
        evidenceClass,
        status,
      })),
    ),
  );
}
