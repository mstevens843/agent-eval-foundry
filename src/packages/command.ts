import { inspectTrialEvidence } from "./evidence.js";
import { loadGapLedger } from "./gaps.js";
import { decidePackage } from "./policy.js";
import { publishPackage, resolvePackage } from "./record.js";
import { packageSourceSeed } from "./source.js";

/** Explicit publication versus read-only inspection; no report regeneration/provider calls. */
export function packageCommand(root: string, args: readonly string[]): string {
  const [operation, store, identity, version] = args;
  if (operation === "gaps" && args.length === 1) return `${JSON.stringify(loadGapLedger(root), null, 2)}\n`;
  if (operation === "trial" && store && identity && (args.length === 3 || args.length === 4)) {
    return `${JSON.stringify(inspectTrialEvidence(identity, { store, ...(version ? { current: resolvePackage(store, version) } : {}) }), null, 2)}\n`;
  }
  if (operation === "inspect" && store && identity && args.length === 3) {
    const snapshot = resolvePackage(store, identity);
    return `${JSON.stringify({ record: snapshot.record, decision: decidePackage({ snapshot, checks: {} }) }, null, 2)}\n`;
  }
  if (operation === "snapshot" && store && identity && version && args.length === 4) {
    const snapshot = publishPackage(store, packageSourceSeed(root, identity, version));
    return `${JSON.stringify({ digest: snapshot.record.digest, id: identity, dependencies: snapshot.record.dependencies, next: `package inspect ${store} ${snapshot.record.digest}` }, null, 2)}\n`;
  }
  throw new Error(
    "usage: package gaps | package snapshot STORE FAMILY VERSION | package inspect STORE DIGEST | package trial STORE TRIAL_DIRECTORY [CURRENT_DIGEST] (host-only private records)",
  );
}
