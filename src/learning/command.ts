import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { publishEvidence, reserveDirectory, writeEvidence } from "../execution/artifacts.js";
import { executionPackage } from "../execution/package-route.js";
import { readNativeReceipt } from "../packages/native-caa.js";
import type { PackagePolicyInput } from "../packages/policy.js";
import { verifyPortfolioReceipt } from "../packages/portfolio.js";
import { outboxFinding, outboxViews, portfolioDirection, portfolioTransfers } from "./cases.js";
import {
  type FindingInput,
  type FindingRevision,
  type TransferRecord,
  appendFinding,
  assessFindings,
  assessTransfer,
  loadFinding,
} from "./findings.js";
import { evidenceIndex, inspectRun } from "./inspection.js";
import { renderFinding, renderTrial } from "./render.js";
import {
  type ConstructionReview,
  type DiversityReview,
  type ProductionCandidate,
  cohortMetrics,
  selectPackages,
} from "./selection.js";
import { appendTransfer, assessStoredTransfers } from "./transfers.js";

function readJson<T>(path: string): T {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024)
    throw Error("LEARNING_INPUT_LIMIT");
  const bytes = readFileSync(path);
  if (bytes.length > 16 * 1024 * 1024) throw Error("LEARNING_INPUT_LIMIT");
  return JSON.parse(bytes.toString());
}
function latest(root: string, ids: readonly string[]): FindingRevision[] {
  const records = new Map<string, FindingRevision>();
  const visit = (id: string) => {
    if (records.has(id)) return;
    const r = loadFinding(join(root, "findings/cases"), id).at(-1);
    if (!r) throw Error(`FINDING_NOT_FOUND:${id}`);
    records.set(id, r);
    for (const claim of r.claims) for (const dep of claim.dependencies) visit(dep.findingId);
  };
  ids.forEach(visit);
  return [...records.values()];
}
export function privateLearningOutput(root: string, path: string): string {
  const target = resolve(root, path);
  const rel = relative(resolve(root), target);
  if (!rel.startsWith(".local/learning/") && !rel.startsWith("findings/generated/"))
    throw Error("LEARNING_OUTPUT_MUST_BE_PRIVATE");
  let ancestor = target;
  while (ancestor !== resolve(root)) {
    if (existsSync(ancestor) && lstatSync(ancestor).isSymbolicLink()) throw Error("LEARNING_OUTPUT_SYMLINK");
    ancestor = dirname(ancestor);
  }
  return target;
}
export interface PortfolioSelectionInput {
  findingIds: string[];
  workInProgress: number;
  portfolioLimit: number;
  diversity: DiversityReview[];
  packages: {
    directory: string;
    receipt: string;
    review: ConstructionReview;
    active: boolean;
    retired: boolean;
    trialDirectories: string[];
    triagedSourceDigests: string[];
    knownIssues: string[];
  }[];
}
export async function inspectPortfolioSelection(
  root: string,
  input: PortfolioSelectionInput,
  options: { trustedReviewers?: Readonly<Record<string, string>> } = {},
) {
  const findings = latest(root, input.findingIds);
  const learning = assessFindings(root, findings, options);
  const candidates: ProductionCandidate[] = [];
  const snapshots = [];
  for (const p of input.packages) {
    const dir = resolve(root, p.directory);
    const pkg = executionPackage(dir);
    snapshots.push(pkg.snapshot);
    let valid = false;
    const receiptProblems: string[] = [];
    try {
      if (pkg.native) readNativeReceipt(pkg.snapshot, resolve(root, p.receipt));
      else await verifyPortfolioReceipt(dir, resolve(root, p.receipt));
      valid = true;
    } catch (e) {
      receiptProblems.push(String(e));
    }
    const checks: PackagePolicyInput["checks"] = {
      reference: valid,
      positiveWork: valid,
      nearMissControls: valid,
      contractReviewed: false,
      publicPackageComplete: true,
      protectedGrading: valid,
      localIntegrityControls: valid,
      boundedSolveEvidence: false,
      destinationChecks: false,
      unresolvedAmbiguities: p.knownIssues.length,
      unrepairedBypasses: 0,
    };
    const trials = p.trialDirectories.map((d) => inspectRun(resolve(root, d), { current: pkg.snapshot }));
    candidates.push({
      id: pkg.snapshot.record.id,
      policy: { snapshot: pkg.snapshot, checks },
      review: {
        ...p.review,
        uncertainty: [
          ...p.review.uncertainty,
          ...receiptProblems,
          ...p.knownIssues,
          "Automated assurance does not certify independent contract or expert-time review.",
        ],
      },
      findings: findings.flatMap((f) => f.claims.map((c) => ({ findingId: f.findingId, claimId: c.id }))),
      trials,
      triagedSourceDigests: p.triagedSourceDigests,
      active: p.active,
      retired: p.retired,
    });
  }
  const source = findings.find((f) => f.findingId === "durableoutbox-cc267");
  const transfers = source ? portfolioTransfers(source, snapshots) : [];
  return {
    learning,
    selection: selectPackages(candidates, learning, {
      workInProgress: input.workInProgress,
      portfolioLimit: input.portfolioLimit,
      diversity: input.diversity,
    }),
    transfers: transfers.map((t) => ({ record: t, assessment: assessTransfer(t, learning) })),
    providerCallsMade: 0,
    automaticRegrades: 0,
  };
}

/** All views are reads; only append/publish-case explicitly write separate local analysis artifacts. */
export async function learningCommand(root: string, args: readonly string[]): Promise<unknown> {
  const reviewerFlag = args.indexOf("--reviewers");
  const options =
    reviewerFlag >= 0
      ? { trustedReviewers: readJson<Record<string, string>>(resolve(root, args[reviewerFlag + 1] ?? "")) }
      : {};
  const positional = args.filter(
    (_, i) => reviewerFlag < 0 || (i !== reviewerFlag && i !== reviewerFlag + 1),
  );
  const [cmd, a, b] = positional;
  if (cmd === "run" && a) {
    const view = inspectRun(resolve(root, a));
    return b === "--json" ? view : renderTrial(view);
  }
  if (cmd === "index" && a) {
    const base = resolve(root, a);
    const directories: string[] = [];
    for (const family of readdirSync(base, { withFileTypes: true }).filter(
      (d) => d.isDirectory() && !d.name.startsWith("."),
    ))
      for (const run of readdirSync(join(base, family.name), { withFileTypes: true }).filter(
        (d) => d.isDirectory() && !d.name.startsWith("."),
      ))
        if (existsSync(join(base, family.name, run.name, "result.json")))
          directories.push(relative(root, join(base, family.name, run.name)));
    if (directories.length > 1000) throw Error("LEARNING_INDEX_LIMIT");
    return evidenceIndex(root, directories.sort());
  }
  if (cmd === "case" && a) {
    const records = latest(root, [a]);
    const [finding] = records;
    if (!finding) throw Error("FINDING_NOT_FOUND");
    const learning = assessFindings(root, records, options);
    const views = finding.sources.map((s) => inspectRun(join(root, s.directory)));
    return b === "--json"
      ? { finding, learning, runs: views }
      : [renderFinding(finding, learning, root), ...views.map(renderTrial)].join("\n\n");
  }
  if (cmd === "append" && a) {
    const record = readJson<FindingInput>(resolve(root, a));
    return appendFinding(join(root, "findings/cases"), record);
  }
  if (cmd === "seed-outbox" && args.length === 1) {
    const { digest: _digest, ...input } = outboxFinding(root);
    return appendFinding(join(root, "findings/cases"), input);
  }
  if (cmd === "publish-case" && a && b) {
    const destination = privateLearningOutput(root, b);
    const records = latest(root, [a]);
    const [finding] = records;
    if (!finding) throw Error("FINDING_NOT_FOUND");
    const assessment = assessFindings(root, records, options);
    const runs = finding.sources.map((s) => inspectRun(join(root, s.directory)));
    const r = reserveDirectory(dirname(destination), destination.split("/").pop() as string);
    writeEvidence(join(r.stage, "finding.json"), finding);
    writeEvidence(join(r.stage, "assessment.json"), assessment);
    writeFileSync(join(r.stage, "README.md"), renderFinding(finding, assessment, root), {
      flag: "wx",
      mode: 0o600,
    });
    for (const view of runs) {
      writeEvidence(join(r.stage, `${view.runId}.json`), view);
      writeFileSync(join(r.stage, `${view.runId}.md`), renderTrial(view), { flag: "wx", mode: 0o600 });
    }
    publishEvidence(r.stage, r.destination, {
      kind: "private-learning-view",
      finding: finding.digest,
      assessment: assessment.digest,
    });
    return { directory: r.destination, finding: finding.digest, providerCallsMade: 0, newAgentAttempts: 0 };
  }
  if (cmd === "assess" && a) {
    const findings = latest(root, a.split(","));
    return assessFindings(root, findings, options);
  }
  if (cmd === "transfer" && a && b) {
    const findings = latest(root, b.split(","));
    return assessTransfer(
      readJson<TransferRecord>(resolve(root, a)),
      assessFindings(root, findings, options),
    );
  }
  if (cmd === "append-transfer" && a) {
    const input = readJson<{ record: TransferRecord; previous: string | null }>(resolve(root, a));
    return appendTransfer(join(root, "findings/transfers"), input.record, input.previous);
  }
  if (cmd === "transfers" && a)
    return assessStoredTransfers(
      join(root, "findings/transfers"),
      assessFindings(root, latest(root, a.split(",")), options),
    );
  if (cmd === "select" && a)
    return inspectPortfolioSelection(root, readJson<PortfolioSelectionInput>(resolve(root, a)), options);
  if (cmd === "cohort" && a) {
    const x = readJson<Parameters<typeof cohortMetrics>>(resolve(root, a));
    return cohortMetrics(...x);
  }
  if (cmd === "directions" && args.length === 1)
    return {
      note: "Construction hypotheses, not agent evidence. Supply exact package versions and current assurance receipts to learning select.",
      packages: [
        "caa-revalidation-repair",
        "browser-replay-repair",
        "persistent-knowledge-repair",
        "delegated-budget-repair",
        "compatible-rollout-repair",
      ].map((id) => ({ id, ...portfolioDirection(id) })),
    };
  if (cmd === "outbox-sources" && args.length === 1)
    return outboxViews(root).map((v) => ({
      runId: v.runId,
      sourceDigest: v.sourceDigest,
      adjudication: v.adjudication.label,
      checkingCandidates: v.checkers.length,
    }));
  throw Error(
    "usage: package:local learning run DIR [--json] | index TRIAL_ROOT | case ID [--json] | seed-outbox | append INPUT_JSON | publish-case ID PRIVATE_DIR | assess ID[,ID] | select INPUT_JSON | transfer JSON FINDING_IDS | append-transfer INPUT_JSON | transfers FINDING_IDS | cohort JSON | directions",
  );
}
