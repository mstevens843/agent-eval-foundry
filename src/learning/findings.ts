import { verify } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { writeEvidence } from "../execution/artifacts.js";
import { safeId } from "../execution/store.js";
import { canonicalJson, safePackagePath, sha256 } from "../packages/record.js";
import { type RootCauseRecord, parseRootCause } from "../trials/root-cause.js";
import { type EvidencePointer, type TrialView, inspectRun } from "./inspection.js";

export const CLAIM_STATUSES = [
  "observation",
  "hypothesis",
  "disputed",
  "local-reproduction",
  "capability-supported",
  "transferred-hardness",
  "withdrawn",
  "superseded",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export interface FindingSource {
  id: string;
  /** Relative to explicitly supplied evidence root. Never a solver package path. */
  directory: string;
  runId: string;
  sourceDigest: string;
  packageDigest: string | null;
  pointers: EvidencePointer[];
}
export interface Claim {
  id: string;
  statement: string;
  status: ClaimStatus;
  sources: string[];
  dependencies: { findingId: string; claimId: string; revisionDigest: string }[];
  /** New adjudication overlays, never sidecar rewrites. Capability upgrades require signed review. */
  adjudications?: { sourceId: string; record: RootCauseRecord }[];
  observedOutcome: string;
  failedObligation: string | null;
  whatWorked: string[];
  visibleChecking: string[];
  mechanism: { interpretation: string; basis: "inferred" | "observed"; alternatives: string[] };
  counterevidence: string[];
  promotionConditions: string[];
  withdrawalConditions: string[];
}
export interface FindingRevision {
  schemaVersion: 1;
  findingId: string;
  revision: number;
  previous: string | null;
  createdAt: string;
  author: { kind: "automated" | "human"; id: string };
  review: { kind: "automated" | "human"; id: string; evidence: string; signature: string | null } | null;
  packageVersion: string;
  sources: FindingSource[];
  claims: Claim[];
  corrections: { previousClaim: string; correction: string; sources: string[] }[];
  digest: string;
}
export type FindingInput = Omit<FindingRevision, "digest">;
export const findingDigest = (input: FindingInput): string => {
  // Detached review signature covers every substantive field and cannot attest itself.
  const body = { ...input, review: input.review ? { ...input.review, signature: null } : null };
  return sha256(canonicalJson(body));
};
export function parseFinding(value: unknown): FindingRevision {
  const r = value as FindingRevision;
  if (!r || r.schemaVersion !== 1 || !Number.isSafeInteger(r.revision) || r.revision < 1)
    throw Error("FINDING_SCHEMA");
  safeId(r.findingId);
  if (
    !/^\d{4}-\d\d-\d\dT/.test(r.createdAt) ||
    !r.packageVersion ||
    !r.author?.id ||
    !["automated", "human"].includes(r.author.kind)
  )
    throw Error("FINDING_PROVENANCE");
  if (
    (r.revision === 1) !== (r.previous === null) ||
    (r.previous !== null && !/^[a-f0-9]{64}$/.test(r.previous))
  )
    throw Error("FINDING_PARENT");
  const ids = new Set<string>();
  for (const s of r.sources) {
    safeId(s.id);
    safePackagePath(s.directory);
    if (ids.has(s.id) || !s.runId || !/^[a-f0-9]{64}$/.test(s.sourceDigest)) throw Error("FINDING_SOURCE");
    ids.add(s.id);
    for (const p of s.pointers) {
      safePackagePath(p.path);
      if (!/^[a-f0-9]{64}$/.test(p.sha256) || typeof p.locator !== "string") throw Error("FINDING_POINTER");
    }
  }
  const claims = new Set<string>();
  if (!Array.isArray(r.claims) || r.claims.length === 0) throw Error("FINDING_CLAIMS");
  for (const c of r.claims) {
    safeId(c.id);
    if (
      claims.has(c.id) ||
      !CLAIM_STATUSES.includes(c.status) ||
      !c.statement ||
      !c.observedOutcome ||
      !c.mechanism?.interpretation ||
      !["inferred", "observed"].includes(c.mechanism.basis)
    )
      throw Error("FINDING_CLAIM");
    claims.add(c.id);
    for (const list of [
      c.sources,
      c.whatWorked,
      c.visibleChecking,
      c.mechanism.alternatives,
      c.counterevidence,
      c.promotionConditions,
      c.withdrawalConditions,
    ])
      if (!Array.isArray(list) || list.some((v) => typeof v !== "string" || !v))
        throw Error("FINDING_CLAIM_LIST");
    if (
      !c.sources.length ||
      c.sources.some((id) => !ids.has(id)) ||
      !c.promotionConditions.length ||
      !c.withdrawalConditions.length
    )
      throw Error("FINDING_CLAIM_BOUNDARY");
    for (const d of c.dependencies) {
      safeId(d.findingId);
      safeId(d.claimId);
      if (!/^[a-f0-9]{64}$/.test(d.revisionDigest)) throw Error("FINDING_DEPENDENCY");
    }
    for (const a of c.adjudications ?? []) {
      if (!c.sources.includes(a.sourceId)) throw Error("FINDING_ADJUDICATION_SOURCE");
      parseRootCause(a.record);
    }
  }
  for (const correction of r.corrections)
    if (
      !correction.previousClaim ||
      !correction.correction ||
      !correction.sources.length ||
      correction.sources.some((s) => !ids.has(s))
    )
      throw Error("FINDING_CORRECTION");
  if (r.review && (!r.review.id || !r.review.evidence || !["human", "automated"].includes(r.review.kind)))
    throw Error("FINDING_REVIEW");
  const { digest, ...body } = r;
  if (digest !== findingDigest(body)) throw Error("FINDING_DIGEST");
  return r;
}
export function appendFinding(store: string, input: FindingInput): FindingRevision {
  const record = parseFinding({ ...input, digest: findingDigest(input) });
  const dir = join(store, record.findingId);
  const versions = loadFinding(store, record.findingId);
  const prior = versions.at(-1);
  if (record.revision !== versions.length + 1 || record.previous !== (prior?.digest ?? null))
    throw Error("FINDING_CONCURRENT_OR_STALE_REVISION");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  // Exclusive numbered file makes conflicting writers fail; no mutable latest pointer.
  writeEvidence(join(dir, `${String(record.revision).padStart(6, "0")}.json`), record);
  return record;
}
export function loadFinding(store: string, id: string): FindingRevision[] {
  safeId(id);
  const dir = join(store, id);
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir)
    .filter((n) => /^\d{6}\.json$/.test(n))
    .sort();
  const versions = names.map((n) => parseFinding(JSON.parse(readFileSync(join(dir, n), "utf8"))));
  versions.forEach((r, i) => {
    if (
      r.findingId !== id ||
      r.revision !== i + 1 ||
      names[i] !== `${String(i + 1).padStart(6, "0")}.json` ||
      r.previous !== (versions[i - 1]?.digest ?? null)
    )
      throw Error("FINDING_HISTORY_BROKEN");
  });
  return versions;
}
export interface ClaimAssessment {
  findingId: string;
  claimId: string;
  revisionDigest: string;
  declaredStatus: ClaimStatus;
  effectiveStatus: ClaimStatus | "source-unavailable" | "needs-revalidation";
  capabilitySupport: boolean;
  exactTargetSupport: boolean;
  humanReviewed: boolean;
  sourcePackageDigests: string[];
  sourceIdentities: { packageDigest: string | null; familyId: string | null; publicDigest: string | null }[];
  dependencies: Claim["dependencies"];
  reasons: string[];
}
export interface LearningView {
  schemaVersion: 1;
  digest: string;
  claims: ClaimAssessment[];
  sources: { id: string; findingId: string; currentDigest: string | null; problems: string[] }[];
}

/** Re-evaluated from current source/adjudication bytes on every query; no stale status-only cache. */
export function assessFindings(
  root: string,
  revisions: readonly FindingRevision[],
  options: { trustedReviewers?: Readonly<Record<string, string>>; inspect?: (dir: string) => TrialView } = {},
): LearningView {
  const latest = new Map<string, FindingRevision>();
  for (const input of revisions) {
    const r = parseFinding(input);
    if (latest.has(r.findingId)) throw Error("FINDING_DUPLICATE_HEAD");
    latest.set(r.findingId, r);
  }
  const inspected = new Map<string, TrialView | Error>();
  const sources: LearningView["sources"] = [];
  const facts = new Map<string, { view: TrialView | null; problems: string[] }>();
  for (const r of latest.values())
    for (const s of r.sources) {
      const dir = join(root, s.directory);
      let current = inspected.get(dir);
      if (!current) {
        try {
          current = (options.inspect ?? inspectRun)(dir);
        } catch (e) {
          current = e instanceof Error ? e : Error(String(e));
        }
        inspected.set(dir, current);
      }
      const issues: string[] = [];
      const view = current instanceof Error ? null : current;
      if (!view) issues.push(`source-unavailable:${String(current)}`);
      else {
        if (
          view.runId !== s.runId ||
          view.sourceDigest !== s.sourceDigest ||
          view.identity.packageDigest !== s.packageDigest
        )
          issues.push("source-or-adjudication-changed");
        for (const p of s.pointers)
          if (!view.files.some((f) => f.path === p.path && f.sha256 === p.sha256))
            issues.push(`pointer-changed-or-missing:${p.path}`);
      }
      facts.set(`${r.findingId}/${s.id}`, { view, problems: issues });
      sources.push({
        id: s.id,
        findingId: r.findingId,
        currentDigest: view?.sourceDigest ?? null,
        problems: issues,
      });
    }
  const assessed = new Map<string, ClaimAssessment>();
  const active = new Set<string>();
  const visit = (r: FindingRevision, c: Claim): ClaimAssessment => {
    const key = `${r.findingId}/${c.id}`;
    const previous = assessed.get(key);
    if (previous) return previous;
    if (active.has(key)) throw Error("FINDING_DEPENDENCY_CYCLE");
    active.add(key);
    const reasons = c.sources.flatMap(
      (id) => facts.get(`${r.findingId}/${id}`)?.problems ?? ["missing-source"],
    );
    const trialViews = c.sources.map((id) => facts.get(`${r.findingId}/${id}`)?.view ?? null);
    let humanReviewed = false;
    if (r.review?.kind === "human") {
      const key = options.trustedReviewers?.[r.review.id];
      try {
        humanReviewed =
          !!key &&
          !!r.review.signature &&
          verify(null, Buffer.from(r.digest), key, Buffer.from(r.review.signature, "base64"));
      } catch {
        /* assertion is not attestation */
      }
      if (!humanReviewed) reasons.push("human-review-unattested");
    }
    for (const d of c.dependencies) {
      const parent = latest.get(d.findingId);
      const claim = parent?.claims.find((x) => x.id === d.claimId);
      if (!parent || !claim) {
        reasons.push("dependency-missing");
        continue;
      }
      const a = visit(parent, claim);
      if (parent.digest !== d.revisionDigest) reasons.push("dependency-revised");
      if (
        !["observation", "local-reproduction", "capability-supported", "transferred-hardness"].includes(
          a.effectiveStatus,
        )
      )
        reasons.push(`dependency-not-supported:${d.findingId}/${d.claimId}`);
      if (["capability-supported", "transferred-hardness"].includes(c.status) && !a.capabilitySupport)
        reasons.push("dependency-not-capability-supported");
    }
    const capabilitySources = trialViews.map((v, i) => {
      if (!v) return false;
      const overlay = c.adjudications?.find((a) => a.sourceId === c.sources[i]);
      if (!overlay) return v.eligibility.capability;
      if (overlay.record.runId !== v.runId || overlay.record.familyId !== v.familyId) {
        reasons.push("adjudication-identity-mismatch");
        return false;
      }
      if (overlay.record.label !== "capability") {
        reasons.push(`adjudication-overlay:${overlay.record.label}`);
        return false;
      }
      if (!humanReviewed) {
        reasons.push("capability-upgrade-requires-attested-review");
        return false;
      }
      // Only the adjudication blocker is overridable, never simulation, version, completeness or identity.
      return v.eligibility.blockers.filter((b) => !b.startsWith("adjudication:")).length === 0;
    });
    if (["capability-supported", "transferred-hardness"].includes(c.status)) {
      if (capabilitySources.some((v) => !v)) reasons.push("source-not-qualified-capability");
      if (!r.review) reasons.push("review-provenance-missing");
    }
    if (c.status === "local-reproduction" && trialViews.some((v) => !v?.observation.semanticComplete))
      reasons.push("local-reproduction-not-complete");
    if (c.status === "transferred-hardness" && !c.dependencies.length)
      reasons.push("transfer-source-missing");
    const withdrawn = ["withdrawn", "superseded"].includes(c.status);
    const effectiveStatus = withdrawn
      ? c.status
      : reasons.some((x) => x.startsWith("source-unavailable"))
        ? "source-unavailable"
        : reasons.length
          ? "needs-revalidation"
          : c.status;
    const capabilitySupport = ["capability-supported", "transferred-hardness"].includes(effectiveStatus);
    const result: ClaimAssessment = {
      findingId: r.findingId,
      claimId: c.id,
      revisionDigest: r.digest,
      declaredStatus: c.status,
      effectiveStatus,
      capabilitySupport,
      exactTargetSupport:
        capabilitySupport &&
        trialViews.every(
          (v, i) =>
            v?.eligibility.exactTarget ||
            (capabilitySources[i] &&
              c.adjudications?.some((a) => a.sourceId === c.sources[i]) &&
              v?.eligibility.blockers.filter((b) => !b.startsWith("adjudication:")).length === 0),
        ),
      humanReviewed,
      sourcePackageDigests: [
        ...new Set(trialViews.flatMap((v) => (v?.identity.packageDigest ? [v.identity.packageDigest] : []))),
      ],
      sourceIdentities: trialViews
        .filter((v): v is TrialView => !!v)
        .map((v) => ({
          packageDigest: v.identity.packageDigest,
          familyId: v.familyId,
          publicDigest: v.identity.publicDigest,
        })),
      dependencies: c.dependencies,
      reasons: [...new Set(reasons)],
    };
    active.delete(key);
    assessed.set(key, result);
    return result;
  };
  for (const r of latest.values()) for (const c of r.claims) visit(r, c);
  const claims = [...assessed.values()].sort((a, b) =>
    `${a.findingId}/${a.claimId}`.localeCompare(`${b.findingId}/${b.claimId}`),
  );
  return {
    schemaVersion: 1,
    digest: sha256(
      canonicalJson({ heads: [...latest.values()].map((r) => r.digest).sort(), sources, claims }),
    ),
    sources,
    claims,
  };
}

export interface TransferRecord {
  schemaVersion: 1;
  id: string;
  source: { findingId: string; claimId: string; revisionDigest: string };
  category: "validity-infrastructure" | "domain-invariant" | "hardness-hypothesis";
  target: { packageId: string; familyId: string; packageDigest: string; contractDigest: string };
  applicability: string;
  layers: string[];
  visibleObligations: string[];
  solutionDifference: string;
  independentObservations: string[];
  correctAlternatives: string[];
  narrowControls: string[];
  counterevidence: string[];
  falsifiers: string[];
  exposures: {
    at: string;
    role: "selection" | "validation" | "inspected" | "held-out-evaluation";
    evidence: string;
  }[];
  targetClaim: { findingId: string; claimId: string } | null;
}
export function assessTransfer(t: TransferRecord, learning: LearningView) {
  safeId(t.id);
  if (
    t.schemaVersion !== 1 ||
    !["validity-infrastructure", "domain-invariant", "hardness-hypothesis"].includes(t.category) ||
    !/^[a-f0-9]{64}$/.test(t.target.packageDigest) ||
    !/^[a-f0-9]{64}$/.test(t.target.contractDigest) ||
    !t.applicability ||
    !t.solutionDifference
  )
    throw Error("TRANSFER_SCHEMA");
  for (const a of [
    t.layers,
    t.visibleObligations,
    t.independentObservations,
    t.correctAlternatives,
    t.narrowControls,
    t.counterevidence,
    t.falsifiers,
  ])
    if (!Array.isArray(a) || !a.length || a.some((x) => !x)) throw Error("TRANSFER_BOUNDARY_MISSING");
  let used = false;
  let heldOutContaminated = false;
  for (const e of [...t.exposures].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (
      !Number.isFinite(Date.parse(e.at)) ||
      !e.evidence ||
      !["selection", "validation", "inspected", "held-out-evaluation"].includes(e.role)
    )
      throw Error("TRANSFER_EXPOSURE");
    if (e.role === "held-out-evaluation" && used) heldOutContaminated = true;
    used = true;
  }
  const source = learning.claims.find(
    (c) => c.findingId === t.source.findingId && c.claimId === t.source.claimId,
  );
  const validSource =
    !!source &&
    source.revisionDigest === t.source.revisionDigest &&
    ["observation", "local-reproduction", "capability-supported", "transferred-hardness"].includes(
      source.effectiveStatus,
    );
  const target = learning.claims.find(
    (c) => c.findingId === t.targetClaim?.findingId && c.claimId === t.targetClaim?.claimId,
  );
  const provenHardness =
    t.category === "hardness-hypothesis" &&
    validSource &&
    source.capabilitySupport &&
    target?.effectiveStatus === "transferred-hardness" &&
    target.exactTargetSupport &&
    target.sourcePackageDigests.includes(t.target.packageDigest) &&
    !source.sourcePackageDigests.includes(t.target.packageDigest) &&
    target.sourceIdentities.some(
      (s) =>
        s.packageDigest === t.target.packageDigest &&
        s.familyId === t.target.familyId &&
        s.publicDigest === t.target.contractDigest,
    ) &&
    target.dependencies.some(
      (d) =>
        d.findingId === t.source.findingId &&
        d.claimId === t.source.claimId &&
        d.revisionDigest === t.source.revisionDigest,
    ) &&
    !heldOutContaminated &&
    t.exposures.some((e) => ["validation", "held-out-evaluation"].includes(e.role));
  return {
    id: t.id,
    category: t.category,
    target: t.target,
    sourceStatus: source?.effectiveStatus ?? "source-unavailable",
    recommendation: !validSource
      ? "revalidate-source-before-support"
      : provenHardness
        ? "supported-target-transfer-requires-scope-review"
        : t.category === "hardness-hypothesis"
          ? "hypothesis-requires-target-evidence"
          : "applicable-principle-requires-target-validation",
    provenHardness: !!provenHardness,
    untouchedHeldOut: t.exposures.length === 0,
    heldOutContaminated,
    digest: sha256(canonicalJson({ t, learning: learning.digest })),
  };
}
