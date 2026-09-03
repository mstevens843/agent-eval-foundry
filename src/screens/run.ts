// The cost-ordered runner. This file is small and it is the whole economic argument.
//
// Screens run cheapest-first and STOP AT THE FIRST KILL. A runner that executed all five and
// reported them together would be correct and useless, because the claim being made is not "these
// four checks find problems" -- any four checks find problems -- it is "the problems are findable
// before the expensive step". You cannot demonstrate that with a runner that always pays for the
// expensive step.
//
// The measured benchmark, from the source project: four of five designs would have been killed at
// step 1, 2 or 3, before any code was written for the task itself. This repository's own record is
// four families killed after they were built and a fifth killed after a complete SPEC and four
// independent readers.

import type { Matrix } from "../types.js";
import { activationAudit } from "./activation.js";
import { type CorpusRow, identifiabilityCheck, leakAudit } from "./leak.js";
import type {
  ActivationVerdict,
  EvidenceChain,
  IdentifiabilityVerdict,
  LeakVerdict,
  ScreenId,
  ViseVerdict,
} from "./types.js";
import { clearsVise, vise } from "./vise.js";

export interface ScreenInput {
  readonly subjectId: string;
  /** Screen 1. Omitted when nobody has written a chain, which is itself a screen-1 failure. */
  readonly chain?: EvidenceChain;
  /** Everything the subject can read, concatenated. Required whenever `chain` is present. */
  readonly visible?: string;
  /** Screen 2. Omitted when the artifact has never been measured. */
  readonly matrix?: Matrix;
  /** Screens 3 and 4. Omitted when the artifact ships no graded corpus. */
  readonly corpus?: readonly CorpusRow[];
}

export interface ScreenResult {
  readonly screen: ScreenId;
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

export interface ScreenRun {
  readonly subjectId: string;
  /** Every screen that actually ran, in cost order. */
  readonly results: readonly ScreenResult[];
  /** The first screen that killed it, or null if it survived everything runnable. */
  readonly killedAt: ScreenId | null;
  /** Screens that could not run for want of input. Not a pass. */
  readonly notRun: readonly { screen: ScreenId; why: string }[];
  readonly viseVerdict: ViseVerdict | null;
  readonly activationVerdict: ActivationVerdict | null;
  readonly leakVerdict: LeakVerdict | null;
  readonly identifiabilityVerdict: IdentifiabilityVerdict | null;
}

/**
 * Run screens 1-4 in cost order, stopping at the first kill.
 *
 * Screen 5, the agent screen, is deliberately not run here. It costs a model and this module's
 * entire point is what can be decided without one; `src/spec-probe/` is the repository's screen 5
 * and it is invoked separately, only for artifacts that survive this.
 *
 * A screen with no input is recorded in `notRun` and NEVER counted as a pass. That distinction is
 * the same one this repository already enforces between a failing cell and an unmeasured one, and
 * for the same reason: an absent measurement that reads as success is how a gate becomes decorative.
 */
export const runScreens = (input: ScreenInput): ScreenRun => {
  const results: ScreenResult[] = [];
  const notRun: { screen: ScreenId; why: string }[] = [];
  let viseVerdict: ViseVerdict | null = null;
  let activationVerdict: ActivationVerdict | null = null;
  let leakVerdict: LeakVerdict | null = null;
  let identifiabilityVerdict: IdentifiabilityVerdict | null = null;
  let killedAt: ScreenId | null = null;

  // Screen 1 -- vise.
  if (input.chain !== undefined && input.visible !== undefined) {
    viseVerdict = vise(input.chain, input.visible);
    const passed = clearsVise(viseVerdict);
    results.push({ screen: "vise", passed, reasons: viseVerdict.reasons });
    if (!passed) killedAt = "vise";
  } else {
    notRun.push({
      screen: "vise",
      why: "no evidence chain was written, which under FINDINGS.md section 9 step 1 is itself the screen-1 failure",
    });
  }

  // Screen 2 -- activation.
  if (killedAt === null) {
    if (input.matrix !== undefined) {
      activationVerdict = activationAudit(input.matrix);
      results.push({
        screen: "activation",
        passed: activationVerdict.passed,
        reasons: activationVerdict.reasons,
      });
      if (!activationVerdict.passed) killedAt = "activation";
    } else {
      notRun.push({ screen: "activation", why: "no measured matrix" });
    }
  }

  // Screen 3 -- leak.
  if (killedAt === null) {
    if (input.corpus !== undefined && input.corpus.length > 0) {
      leakVerdict = leakAudit(input.subjectId, input.corpus);
      results.push({ screen: "leak", passed: leakVerdict.passed, reasons: leakVerdict.reasons });
      if (!leakVerdict.passed) killedAt = "leak";
    } else {
      notRun.push({ screen: "leak", why: "no graded corpus" });
    }
  }

  // Screen 4 -- identifiability.
  if (killedAt === null) {
    if (input.corpus !== undefined && input.corpus.length > 0) {
      identifiabilityVerdict = identifiabilityCheck(input.subjectId, input.corpus);
      results.push({
        screen: "identifiability",
        passed: identifiabilityVerdict.passed,
        reasons: identifiabilityVerdict.reasons,
      });
      if (!identifiabilityVerdict.passed) killedAt = "identifiability";
    } else {
      notRun.push({ screen: "identifiability", why: "no graded corpus" });
    }
  }

  return {
    subjectId: input.subjectId,
    results,
    killedAt,
    notRun,
    viseVerdict,
    activationVerdict,
    leakVerdict,
    identifiabilityVerdict,
  };
};

/**
 * Build the corpus rows screens 3 and 4 want out of a measured matrix.
 *
 * TWO THINGS HERE ARE LOAD-BEARING AND BOTH WERE WRONG IN THE FIRST VERSION.
 *
 * First, `schedule` is DECOMPOSED and then dropped. In this repository a schedule string is the
 * knob tuple joined by "/" -- "revoked/exact/fresh/r2" -- so it is very nearly a unique key per
 * instance, and a decision tree splitting on a unique key reaches whatever accuracy you like by
 * memorising it. Feeding it in whole measured identifier leakage and reported it as task leakage,
 * which put two families' classifier accuracy at 75-100% for no reason connected to the task.
 * `id` is excluded for exactly the same reason, and `seed` because it is a nuisance parameter that
 * indexes instances rather than describing them.
 *
 * Second, what the label MEANS is narrower than "the answer". These matrices do not ship a
 * per-scenario expected output, so the label here is WHICH CHECKS THE SCENARIO GRADES -- the set of
 * checks some subject failed on it. A high score therefore says "what this scenario tests is a
 * shallow function of its knobs", which is a real and useful thing to know and is NOT the same
 * claim as "a solver can shortcut to the answer". The report must not upgrade one to the other.
 */
export const corpusFromMatrix = (m: Matrix): readonly CorpusRow[] => {
  const subjects = m.subjects.map((s) => s.id).filter((id) => id !== m.reference_subject);
  return m.instances.map((inst) => {
    const parts = inst.schedule.split("/");
    const visible: Record<string, string | number | null> = {
      keys: inst.keys,
      family: inst.family,
      source: inst.source,
      note: inst.note,
    };
    parts.forEach((p, i) => {
      visible[`knob${i}`] = p;
    });

    const graded = new Set<string>();
    for (const sid of subjects) {
      const cell = m.results[inst.id]?.[sid];
      if (cell == null) continue;
      for (const c of cell.failed) graded.add(c);
    }
    return { id: inst.id, visible, label: [...graded].sort().join("+") || "(nothing)" };
  });
};
