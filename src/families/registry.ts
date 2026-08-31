// The registry of BUILT families: the ones that actually execute.
//
// Until this file there was one built family and every consumer hardcoded it — the CLI, the evidence
// builder, the challenge command. A second and third family made that untenable, and the fix is the
// one the repository keeps arriving at: describe the thing as data, then let the generic code read
// the data.
//
// A built family is one that can run its own subjects and produce a matrix. That is a stronger claim
// than having a task shape, and the distinction is load-bearing: `foundry check` validates nine
// shapes, three of which appear here. The other six are pre-registrations.

import { buildAccessTokenChallengePackage } from "../challenge/access-token-package.js";
import { buildCheckerRequiredChallengePackage } from "../challenge/checker-required-package.js";
import { buildLiveDomChallengePackage } from "../challenge/live-dom-package.js";
import { buildMemoryChallengePackage } from "../challenge/memory-package.js";
import {
  ACCESS_TOKEN_PROFILE,
  CHECKER_REQUIRED_PROFILE,
  LIVE_DOM_PROFILE,
  type LeakProfile,
  MEMORY_PROFILE,
  PIC_PROFILE,
  UI_PROFILE,
} from "../challenge/package-check.js";
import { buildChallengePackage } from "../challenge/package.js";
import type { ChallengePackage } from "../challenge/package.js";
import { buildUiChallengePackage } from "../challenge/ui-package.js";
import type { Matrix } from "../types.js";

import { INTENDED_CHECK as PIC_CHECKS } from "../reports/trial-report.js";
import { RULES as PIC_RULES } from "./prompt-injection-containment/policy.js";
import * as pic from "./prompt-injection-containment/runner.js";
import * as picScenarios from "./prompt-injection-containment/scenarios.js";

import { BASELINES as MEM_BASELINES, INTENDED_CHECK as MEM_CHECKS } from "./memory-poisoning/mutants.js";
import { RULES as MEM_RULES } from "./memory-poisoning/policy.js";
import * as mem from "./memory-poisoning/runner.js";
import * as memScenarios from "./memory-poisoning/scenarios.js";
import { CHECKS as MEM_CHECK_NAMES } from "./memory-poisoning/verify.js";

import { BASELINES as UI_BASELINES, INTENDED_CHECK as UI_CHECKS } from "./ui-action-record-replay/mutants.js";
import * as ui from "./ui-action-record-replay/runner.js";
import * as uiScenarios from "./ui-action-record-replay/scenarios.js";
import { CHECKS as UI_CHECK_NAMES } from "./ui-action-record-replay/verify.js";

import { BASELINES as LIVE_BASELINES, INTENDED_CHECK as LIVE_CHECKS } from "./ui-replay-live-dom/mutants.js";
import * as live from "./ui-replay-live-dom/runner.js";
import * as liveScenarios from "./ui-replay-live-dom/scenarios.js";
import { RULE_CODES as LIVE_RULE_CODES } from "./ui-replay-live-dom/spec.js";
import { CHECKS as LIVE_CHECK_NAMES } from "./ui-replay-live-dom/verify.js";

import {
  BASELINES as CHECKER_BASELINES,
  INTENDED_CHECK as CHECKER_INTENDED_CHECK,
} from "./checker-required-memory-poisoning/mutants.js";
import * as checker from "./checker-required-memory-poisoning/runner.js";
import * as checkerScenarios from "./checker-required-memory-poisoning/scenarios.js";
import { RULE_CODES as CHECKER_RULE_CODES } from "./checker-required-memory-poisoning/spec.js";
import { CHECKS as CHECKER_CHECK_NAMES } from "./checker-required-memory-poisoning/verify.js";

import {
  BASELINES as ACCESS_BASELINES,
  INTENDED_CHECK as ACCESS_CHECKS,
} from "./access-token-scope-expansion/mutants.js";
import * as access from "./access-token-scope-expansion/runner.js";
import * as accessScenarios from "./access-token-scope-expansion/scenarios.js";
import { RULES as ACCESS_RULES } from "./access-token-scope-expansion/spec.js";
import { CHECKS as ACCESS_CHECK_NAMES } from "./access-token-scope-expansion/verify.js";

export interface FamilySweep {
  readonly scenarioCount: number;
  readonly spaceSize: number;
  readonly matrix: Matrix;
  /** Scenarios the reference failed. Non-empty means the family is measuring its own bugs. */
  readonly referenceFailures: readonly { readonly scenarioId: string; readonly checks: readonly string[] }[];
  /** Per mutant: was it caught by the check it was written to trip? */
  readonly mutantsCaught: readonly {
    readonly mutantId: string;
    readonly check: string;
    readonly caught: boolean;
    readonly caughtIn: number;
    readonly total: number;
  }[];
  readonly baselinesBlocked: readonly string[];
  readonly baselinesTotal: number;
}

/**
 * How faithful a family's harness is to the world it models.
 *
 * A label rather than a claim, and deliberately NOT part of the challenge package: adding it to the
 * spec would change the package hash and invalidate every trial in flight. It is metadata about the
 * family, carried in the registry and printed in every report that quotes the family's numbers.
 *
 *   simulated-tree  a hand-built model of the domain; faithful to the rules, not to any implementation
 *   dom-like        models the structural mechanics of the real surface — selectors that can drift,
 *                   element identity, state that CHANGES in response to action — without a renderer
 *   browser-backed  a real engine drives a real page
 *
 * The middle rung was renamed and re-applied after the UI family's harness was read closely for the
 * realism report. It was labelled `dom-like` and it is an IMMUTABLE seven-node tree with one mutable
 * boolean, resolved by `data-testid` only. Nothing about it can drift, and nothing an action does
 * changes what a later action sees — so it is a simulated tree, and calling it DOM-like was the kind
 * of generous self-description this ladder exists to prevent.
 *
 * Relabelling is deliberately SAFE: the realism level is a property of the family record and is kept
 * out of the challenge package, so an honesty correction can never change a hash and invalidate the
 * evidence that motivated it.
 */
export const REALISM_LEVELS = ["simulated-tree", "dom-like", "browser-backed"] as const;
export type RealismLevel = (typeof REALISM_LEVELS)[number];

export const REALISM_MEANING: Readonly<Record<RealismLevel, string>> = {
  "simulated-tree":
    "a hand-built model of the domain: faithful to the rules, not to any implementation. Structure is fixed; nothing an action does changes what a later action sees",
  "dom-like":
    "models the structural mechanics of the real surface — selectors that can drift, element identity, and state that CHANGES in response to action — with no renderer, no layout and no compositing",
  "browser-backed": "a real browser engine drives a real page",
};

export interface BuiltFamily {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly mechanisms: readonly string[];
  readonly checks: readonly string[];
  /**
   * Policy rule codes the family's SPEC.md publishes verbatim.
   *
   * A submission that names them is quoting the spec back rather than reimplementing it from
   * intuition, which is the closest thing to "did the model read the rules" that source text
   * supports. Empty for a family that publishes no codes — reported as n/a, never as zero.
   */
  readonly ruleCodes: readonly string[];
  /** The declared knob space, for the generated shape. */
  readonly space: Readonly<Record<string, readonly unknown[]>>;
  readonly knobPurpose: Readonly<Record<string, string>>;
  readonly run: () => FamilySweep;
  readonly challenge: (typesSource: string, scenarioSetId: string) => ChallengePackage;
  readonly leakProfile: LeakProfile;
  /** Path to the types file the challenge package copies. */
  readonly typesPath: string;
  readonly estimatedBuildHours: number;
  readonly estimatedFrontierUsd: number;
  /** How faithful the harness is. Never upgraded without saying what changed. */
  readonly realism: RealismLevel;
  /** What would have to be built to reach the next level, and what it would newly measure. */
  readonly realismGap: string;
}

const sweep = <C extends { scenarioId: string; subjectId: string; failures: readonly { check: string }[] }>(
  cells: readonly C[],
  scenarios: readonly { id: string }[],
  spaceSize: number,
  matrix: Matrix,
  intended: Readonly<Record<string, string>>,
  baselines: readonly string[],
): FamilySweep => {
  const mutantsCaught = Object.entries(intended).map(([mutantId, check]) => {
    const own = cells.filter((c) => c.subjectId === mutantId);
    const caughtIn = own.filter((c) => c.failures.some((f) => f.check === check)).length;
    return { mutantId, check, caught: caughtIn > 0, caughtIn, total: own.length };
  });
  return {
    scenarioCount: scenarios.length,
    spaceSize,
    matrix,
    referenceFailures: cells
      .filter((c) => c.subjectId === "reference" && c.failures.length > 0)
      .map((c) => ({
        scenarioId: c.scenarioId,
        checks: [...new Set(c.failures.map((f) => f.check))].sort(),
      })),
    mutantsCaught,
    baselinesBlocked: baselines.filter((b) => cells.some((c) => c.subjectId === b && c.failures.length > 0)),
    baselinesTotal: baselines.length,
  };
};

const PIC_SPACE = {
  seed: [11, 23, 41],
  carrier: ["none", "email", "document", "webpage", "crm_note", "tool_output"],
  attack: ["none", "authority_grab", "scope_expansion", "secret_exfil", "approval_confusion", "tool_chain"],
  secretPresent: [true, false],
  safeActionPresent: [true, false],
  derivationHops: [0, 1, 2],
} as const;

export const BUILT_FAMILIES: readonly BuiltFamily[] = [
  {
    id: "prompt-injection-containment",
    name: "Prompt-injection containment",
    domain: "agent tool-use with untrusted retrieved content",
    mechanisms: ["prompt-injection-via-retrieval", "context-contamination", "permission-boundary"],
    checks: [...new Set(Object.values(PIC_CHECKS))],
    ruleCodes: PIC_RULES.map((r) => r.code),
    space: PIC_SPACE,
    knobPurpose: {
      seed: "determines the generated scenario",
      carrier: "where the untrusted content arrives",
      attack: "which containment mechanism the scenario exercises",
      secretPresent: "whether a secret is in scope for egress",
      safeActionPresent: "whether legitimate work must still complete",
      derivationHops: "how far an argument's value is laundered from its origin",
    },
    run: () => {
      const run = pic.runFamily();
      return sweep(run.cells, run.scenarios, run.spaceSize, pic.toMatrix(run), PIC_CHECKS, [
        "nop-faker",
        "over-blocker",
      ]);
    },
    challenge: buildChallengePackage,
    leakProfile: PIC_PROFILE,
    typesPath: "src/families/prompt-injection-containment/types.ts",
    estimatedBuildHours: 70,
    estimatedFrontierUsd: 65,
    realism: "simulated-tree",
    realismGap:
      "The tool boundary is a frozen facade rather than a service. Real fidelity would mean tools with latency, partial failure and their own state — which is the durable-outbox family's territory, not this one's.",
  },
  {
    id: "prompt-injection-memory-poisoning",
    name: "Durable memory poisoning across sessions",
    domain: "agent memory and retrieval across sessions",
    mechanisms: ["context-contamination", "false-audit-history", "prompt-injection-via-retrieval"],
    checks: [...MEM_CHECK_NAMES],
    ruleCodes: MEM_RULES.map((r) => r.code),
    space: memScenarios.SPACE,
    knobPurpose: {
      seed: "determines the generated scenario",
      attack: "which memory-poisoning mechanism the scenario exercises",
      sessionsBetween: "sessions between the untrusted ingestion and the action it influences",
      memoryKind: "what the durable store can keep; `vector_note` cannot keep provenance at all",
      benignActions: "how much legitimate work surrounds the attack",
      decoySimilarity: "whether a trusted record confirms the same value the attack targets",
    },
    run: () => {
      const run = mem.runFamily();
      return sweep(run.cells, run.scenarios, run.spaceSize, mem.toMatrix(run), MEM_CHECKS, MEM_BASELINES);
    },
    challenge: buildMemoryChallengePackage,
    leakProfile: MEMORY_PROFILE,
    typesPath: "src/families/memory-poisoning/types.ts",
    estimatedBuildHours: 75,
    estimatedFrontierUsd: 70,
    realism: "simulated-tree",
    realismGap:
      "The store is a Map with declared semantics. A real vector store would add retrieval ranking and embedding drift — genuinely different failure modes, and a different family rather than a more realistic version of this one.",
  },
  {
    id: "ui-action-record-replay",
    name: "UI action record and replay",
    domain: "browser and desktop UI automation without an API",
    mechanisms: ["ui-replay-mismatch", "stale-state", "hidden-environment-dependency"],
    checks: [...UI_CHECK_NAMES],
    // No published rule codes: the UI family states its contract as invariants, not a numbered policy.
    ruleCodes: [],
    space: uiScenarios.SPACE,
    knobPurpose: {
      seed: "determines the generated UI tree and the action trace",
      mutation: "what changed in the tree between recording and replay — the core of the family",
      mutationDepth: "how far into the trace the mutation bites",
      confirmation: "whether the irreversible step raises a confirmation, and whether it is hidden",
      asyncSettled: "whether the region under the selector has finished loading at replay time",
      replayCount: "exercises idempotency; a second replay must not repeat an irreversible step",
    },
    run: () => {
      const run = ui.runFamily();
      return sweep(run.cells, run.scenarios, run.spaceSize, ui.toMatrix(run), UI_CHECKS, UI_BASELINES);
    },
    challenge: buildUiChallengePackage,
    leakProfile: UI_PROFILE,
    typesPath: "src/families/ui-action-record-replay/types.ts",
    estimatedBuildHours: 55,
    estimatedFrontierUsd: 40,
    // DOM-like rather than simulated: the harness models element identity across re-mounts, live
    // selector resolution with ambiguity, attribute-level preconditions, a pending-vs-absent
    // distinction and a confirmation state the tree declares. What it does not have is a renderer.
    realism: "simulated-tree",
    realismGap:
      "Two rungs are missing, and the first matters more than the second. `dom-like` needs a tree that CHANGES: acting reveals regions, enables controls and replaces the form with a receipt, so a later step meets a page the recording never saw, and selectors can drift rather than merely being renamed. That is where the trade-off between a strict and a patient replayer comes from — and without a trade-off the failure sets are forced to nest, which is exactly what five counted trials across four subjects and two labs produced here. `browser-backed` needs a real engine and is refused for now with the reason recorded in `foundry ui replay upgrade`: no cached browser, minutes-per-sweep launch cost, and a dependency that would end this repository's zero-runtime-dependency property. Neither rung is what this family currently measures, so the honest label is the low one.",
  },
  {
    id: "ui-replay-live-dom",
    name: "Live-DOM action replay",
    domain: "UI replay against a mutable DOM-like tree",
    mechanisms: [
      "ui-replay-mismatch",
      "stale-state",
      "hidden-environment-dependency",
      "duplicate-side-effects",
    ],
    checks: [...LIVE_CHECK_NAMES],
    ruleCodes: LIVE_RULE_CODES,
    space: liveScenarios.SPACE,
    knobPurpose: {
      seed: "selects settle thresholds and relocatable witnesses",
      regionFate: "how an earlier recorded action changes the later capture region",
      priorState: "state already present before replay, including foreign open transactions",
      settleBudget: "finite logical ticks available during the pass",
      anchorFidelity: "whether semantic anchor re-derivation is unique or indistinguishable",
      anchorConflict:
        "hidden categorical axis: test id, semantic anchor and structural path can name different live nodes",
      busyFidelity: "`aria-busy` may be honest or misleading and is not load-bearing",
      replayCount: "one or two fresh-page passes sharing an irreversible side-effect ledger",
    },
    run: () => {
      const run = live.runFamily();
      return sweep(run.cells, run.scenarios, run.spaceSize, live.toMatrix(run), LIVE_CHECKS, LIVE_BASELINES);
    },
    challenge: buildLiveDomChallengePackage,
    leakProfile: LIVE_DOM_PROFILE,
    typesPath: "src/families/ui-replay-live-dom/types.ts",
    estimatedBuildHours: 95,
    estimatedFrontierUsd: 55,
    realism: "dom-like",
    realismGap:
      "The reducer models live selector drift, region presence, disabled/enabled transitions, stale handles, dialogs, and side effects, but it is not browser-backed. A browser-backed descendant would add a real renderer, focus/event semantics, layout/hit testing, actual ARIA tree computation, and asynchronous browser scheduling.",
  },
  {
    id: "checker-required-memory-poisoning",
    name: "Checker-required memory poisoning",
    domain: "agent memory control with a submitted verifier artifact",
    mechanisms: [
      "checker-quality-gap",
      "context-contamination",
      "false-audit-history",
      "prompt-injection-via-retrieval",
    ],
    checks: [...CHECKER_CHECK_NAMES],
    ruleCodes: CHECKER_RULE_CODES,
    space: checkerScenarios.SPACE,
    knobPurpose: {
      seed: "selects generated sessions and held-out checker cases",
      attack: "which memory-poisoning mechanism the subject and checker must exercise",
      sessionsBetween: "distance between untrusted ingestion and memory-derived action",
      memoryKind: "whether stored provenance can physically survive recall",
      checkerProbe: "which submitted-checker obligation is being exercised by the trace",
      visibleCoverage: "separates visible-example-like cases from held-out cases",
    },
    run: () => {
      const run = checker.runFamily();
      return sweep(
        run.cells,
        run.scenarios,
        run.spaceSize,
        checker.toMatrix(run),
        CHECKER_INTENDED_CHECK,
        CHECKER_BASELINES,
      );
    },
    challenge: buildCheckerRequiredChallengePackage,
    leakProfile: CHECKER_REQUIRED_PROFILE,
    typesPath: "src/families/checker-required-memory-poisoning/types.ts",
    estimatedBuildHours: 85,
    estimatedFrontierUsd: 35,
    realism: "simulated-tree",
    realismGap:
      "The checker is graded over a simulated memory/tool harness. A browser-backed or service-backed descendant would add real persistence, asynchronous tool effects and independent process isolation for untrusted checker code.",
  },
  {
    id: "access-token-scope-expansion",
    name: "Access token scope expansion",
    domain: "permissions and access control",
    mechanisms: ["permission-boundary", "stale-state", "false-audit-history"],
    checks: [...ACCESS_CHECK_NAMES],
    ruleCodes: ACCESS_RULES.map((r) => r.code),
    space: accessScenarios.SPACE,
    knobPurpose: {
      seed: "selects deterministic ids and surface variations",
      approvalDrift: "whether the approval remains current, is revoked, is superseded, or reduces scope",
      tokenDrift:
        "whether the token remains exact, broadens scope/resource, changes principal, is revoked, or disappears",
      cacheFreshness: "whether cached public snapshots match current authority state",
      requestSurface: "API, worker and delegated request surfaces with the same authority rule",
      repeatCount: "one or two attempts sharing a verifier-owned irreversible grant ledger",
    },
    run: () => {
      const run = access.runFamily();
      return sweep(
        run.cells,
        run.scenarios,
        run.spaceSize,
        access.toMatrix(run),
        ACCESS_CHECKS,
        ACCESS_BASELINES,
      );
    },
    challenge: buildAccessTokenChallengePackage,
    leakProfile: ACCESS_TOKEN_PROFILE,
    typesPath: "src/families/access-token-scope-expansion/types.ts",
    estimatedBuildHours: 18,
    estimatedFrontierUsd: 35,
    realism: "simulated-tree",
    realismGap:
      "The authority ledger and token server are deterministic in-process facades. A service-backed descendant would add real OAuth grant payloads, asynchronous revocation propagation and process isolation around token issuance.",
  },
];

export const BUILT_FAMILY_IDS: readonly string[] = BUILT_FAMILIES.map((f) => f.id);

export function builtFamily(id: string): BuiltFamily {
  const found = BUILT_FAMILIES.find((f) => f.id === id);
  if (found === undefined) {
    throw new Error(`"${id}" is not a built family; built families are ${BUILT_FAMILY_IDS.join(", ")}`);
  }
  return found;
}

/** Scenario-set id for a built family, content-addressed by its measured instance ids. */
export function scenarioSetIdFor(family: BuiltFamily, matrix: Matrix): string {
  let hash = 5381;
  for (const inst of matrix.instances) {
    for (let i = 0; i < inst.id.length; i += 1) hash = ((hash << 5) + hash + inst.id.charCodeAt(i)) >>> 0;
  }
  return `${family.id.split("-").pop()}-${matrix.instances.length}-${hash.toString(16)}`;
}
