// Running one real agent trial, for any routable family.
//
// This module is separate from `orchestrate.ts` for a boring but load-bearing reason: the router
// needs the containment grader, so if the runner lived beside that grader the two would import each
// other. Here the arrows point one way — run → router → families, and run → orchestrator → providers.
//
// What it adds beyond the orchestrator is the CHALLENGE HASH. The package is rebuilt from the family
// for every trial and hashed; the hash goes into the trial metadata. A trial whose challenge hash
// does not match the family's current package was run against a different task, and
// `assertChallengeMatch` refuses to count it. Without that, a family can be edited after a trial and
// the old result silently keeps counting for the new task — which is the same class of error as
// grading a submission against a scenario set it never saw.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ChallengePackage } from "../challenge/package.js";
import { fail } from "../foundry/schema.js";
import { baselineDisqualifier } from "./orchestrate.js";
import { type OrchestrateResult, orchestrateTrial } from "./orchestrator.js";
import { type TrialRoute, routeFor } from "./router.js";

/** Content hash of a challenge package: every visible file, path and bytes, in sorted order. */
export function challengeHash(pkg: ChallengePackage): string {
  const hash = createHash("sha256");
  for (const file of [...pkg.files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 32);
}

export interface PreparedChallenge {
  readonly route: TrialRoute;
  readonly pkg: ChallengePackage;
  readonly hash: string;
  readonly scenarioSetId: string;
  /** Directory the package was written to. */
  readonly dir: string;
}

/** Build the family's challenge into a fresh directory and hash it. */
export function prepareChallenge(root: string, familyId: string, outDir?: string): PreparedChallenge {
  const route = routeFor(familyId);
  const typesSource = readFileSync(join(root, route.family.typesPath), "utf8");
  const scenarioSetId = route.scenarioSetId();
  const pkg = route.family.challenge(typesSource, scenarioSetId);
  const dir = outDir ?? mkdtempSync(join(tmpdir(), `foundry-${familyId}-`));
  for (const file of pkg.files) {
    const dest = join(dir, file.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, file.content, "utf8");
  }
  return { route, pkg, hash: challengeHash(pkg), scenarioSetId, dir };
}

/**
 * A trial run against a different challenge than the family currently produces cannot count.
 *
 * The failure this prevents is quiet: edit a scenario generator, regenerate the package, and every
 * previously counted trial keeps counting for a task nobody ran. The hash makes "the model saw
 * exactly this" checkable rather than assumed.
 */
export function assertChallengeMatch(recorded: string | null, current: string, runId: string): void {
  if (recorded === null || recorded.length === 0) {
    fail(
      "TRIAL_CHALLENGE_HASH_MISSING",
      `trial.${runId}`,
      "records no challenge hash, so there is no way to tell which task it was run against",
    );
  }
  if (recorded !== current) {
    fail(
      "TRIAL_CHALLENGE_HASH_MISMATCH",
      `trial.${runId}`,
      `was run against challenge ${recorded} and the family now produces ${current}; the trial measured a different task`,
    );
  }
}

export interface HashGate {
  readonly runId: string;
  readonly recorded: string | null;
  readonly current: string;
  readonly matches: boolean;
}

/**
 * Split a family's trial directories into those that measured the CURRENT task and those that did
 * not.
 *
 * Called by the evidence builder, which is what makes the challenge hash operational rather than
 * decorative. It is not hypothetical: repairing an ambiguity in the memory family's spec — an
 * ambiguity a real trial exposed by citing a rule the published order said was correct — changed the
 * package, and three counted trials stopped counting the instant it did. That is the intended
 * behaviour. The alternative is a family whose evidence is for a task nobody can read any more.
 */
export function gateByChallengeHash(
  root: string,
  familyId: string,
  trials: readonly { readonly runId: string; readonly metadataPath: string; readonly dir: string }[],
): { readonly current: string; readonly gates: readonly HashGate[] } {
  const prepared = prepareChallenge(root, familyId);
  const gates = trials.map((t) => {
    let recorded: string | null = null;
    try {
      const meta = JSON.parse(readFileSync(t.metadataPath, "utf8")) as Record<string, unknown>;
      recorded = typeof meta["challengeHash"] === "string" ? meta["challengeHash"] : null;
    } catch {
      recorded = null;
    }
    // Trials that predate the hash field are not lost. Every trial directory preserves the exact
    // challenge the model saw, so the hash can be recomputed from the evidence itself — which is a
    // better source than the metadata anyway, because it is the artifact rather than a note about it.
    const derived = recorded ?? hashChallengeDir(join(t.dir, "challenge"));
    return { runId: t.runId, recorded: derived, current: prepared.hash, matches: derived === prepared.hash };
  });
  return { current: prepared.hash, gates };
}

/** Hash a preserved challenge directory the same way `challengeHash` hashes a package. */
export function hashChallengeDir(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const files: { path: string; content: string }[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const next = join(current, entry.name);
      if (entry.isDirectory()) walk(next, `${prefix}${entry.name}/`);
      else files.push({ path: `${prefix}${entry.name}`, content: readFileSync(next, "utf8") });
    }
  };
  walk(dir, "");
  const hash = createHash("sha256");
  for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 32);
}

export interface AgentTrialOptions {
  readonly root: string;
  readonly familyId: string;
  readonly runId: string;
  readonly provider: string;
  readonly model: string;
  readonly subjectId: string;
  readonly effort?: string | null;
  readonly command?: readonly string[];
  readonly timeoutMs?: number;
  readonly inheritEnv?: boolean;
  readonly costUsd?: number | null;
  /** Campaign this trial belongs to, recorded in the metadata. */
  readonly campaign?: string | null;
}

/**
 * Build the challenge, hand it to a provider, grade whatever comes back, write a durable directory.
 *
 * Family-agnostic: everything family-specific comes from the route.
 */
export function runAgentTrial(options: AgentTrialOptions): OrchestrateResult {
  const prepared = prepareChallenge(options.root, options.familyId);
  const route = prepared.route;

  return orchestrateTrial({
    familyId: options.familyId,
    runId: options.runId,
    challengeDir: prepared.dir,
    trialsRoot: join(options.root, "trials"),
    instruction: route.instruction,
    provider: options.provider,
    model: options.model,
    effort: options.effort ?? null,
    subjectId: options.subjectId,
    scenarioSetId: prepared.scenarioSetId,
    timeoutMs: options.timeoutMs ?? 900_000,
    ...(options.command === undefined ? {} : { command: options.command }),
    ...(options.inheritEnv === undefined ? {} : { inheritEnv: options.inheritEnv }),
    costUsd: options.costUsd ?? null,
    grade: (modulePath: string) => {
      const out = route.grade(modulePath);
      return { cells: out.cells, detail: out.detail };
    },
    disqualify: baselineDisqualifier(options.familyId),
    extraMetadata: {
      challengeHash: prepared.hash,
      challengeFiles: prepared.pkg.files.length,
      campaign: options.campaign ?? null,
      hostScript: route.hostScript.split("/").pop() ?? route.hostScript,
      scenariosExpected: route.scenarioCount(),
    },
  });
}
