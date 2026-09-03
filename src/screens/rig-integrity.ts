// The rig-integrity gate: a measurement apparatus must prove it can measure before its output counts.
//
// WHY THIS EXISTS, AND IT IS THE MOST EMBARRASSING ENTRY IN THIS REPOSITORY.
//
// Phase 9's central claim was that the recompute defect is independently fatal: a reference engine
// passes every instance and an otherwise byte-identical engine that recomputes its key fails every
// instance. The first rig that measured this attached the tool's ground truth as `result["tool"]`.
// The checks read `result["_tool"]`. `_tool()` returns `result.get("_tool") or {}`, so every
// tool-dependent check ran against an EMPTY DICT and evaluated it as a failure.
//
// The reference engine appeared to fail all 18 instances. The number was wrong, confident, and
// perfectly formatted. Nothing flagged it. It was caught because a correct engine failing everywhere
// is not a believable result -- by disbelief, not by a gate.
//
// THAT IS THIS PROJECT'S SIGNATURE DEFECT, OCCURRING INSIDE THE INSTRUMENT THAT WAS VALIDATING THE
// PHASE'S HEADLINE CLAIM. It is the same family as "a rule nothing enforces" and "a check that never
// fires": machinery returning a verdict it has no basis for. The repository has now found this class
// four times in specifications, three times in its own infrastructure, and once here -- in the
// measuring apparatus itself.
//
// Disbelief is not a gate. This is the gate.

/** One control subject a rig must grade correctly before anything it says counts. */
export interface RigControl {
  readonly id: string;
  /** What the rig must conclude. A known-good must pass; a known-bad must fail. */
  readonly expect: "pass" | "fail";
  /** What the rig actually concluded: the checks it reported failing. Empty means "passed". */
  readonly observedFailures: readonly string[];
}

export interface RigVerdict {
  readonly rigId: string;
  /** False means the run is VOID, not that the subjects are bad. */
  readonly usable: boolean;
  readonly reasons: readonly string[];
  /** Controls that came back the wrong way round. */
  readonly brokenControls: readonly string[];
  readonly degenerate: boolean;
}

/**
 * B1 -- the control. A rig that cannot tell a known-good from a known-bad cannot tell anything.
 *
 * This is deliberately the cheapest possible check and it would have caught the Phase 9 defect in
 * seconds: the reference engine is the known-good, it was reported as failing, and the run would
 * have been voided before a single number reached a report.
 */
export const controlsHold = (controls: readonly RigControl[]): readonly string[] =>
  controls
    .filter((c) => (c.expect === "pass") === c.observedFailures.length > 0)
    .map(
      (c) =>
        `${c.id}: expected to ${c.expect} and did the opposite${c.observedFailures.length > 0 ? ` (failed ${c.observedFailures.join(", ")})` : ""}`,
    );

/**
 * B2 -- degeneracy. All-pass and all-fail are suspicious BY CONSTRUCTION.
 *
 * Not because they are wrong -- a well-isolated axis legitimately produces all-fail against a mutant,
 * and Phase 9's real result was exactly that. Because they are the shape a broken rig produces, and
 * they are therefore the shape that must never be reported without a control in the same invocation.
 */
export const isDegenerate = (cells: readonly (readonly string[])[]): boolean => {
  if (cells.length === 0) return true;
  const anyFailed = cells.some((c) => c.length > 0);
  const allFailed = cells.every((c) => c.length > 0);
  return !anyFailed || allFailed;
};

/**
 * B3 -- shape assertion. The specific failure was a silently absent key becoming an empty dict, and
 * an empty dict evaluating as a failing subject.
 *
 * AN EMPTY INPUT IS NOT A FAILING INPUT. A check handed a structure that is absent, empty, or the
 * wrong shape must raise rather than return a verdict, because a verdict computed from no data is
 * indistinguishable in the output from a verdict computed from data.
 */
export class RigInputError extends Error {}

export const requireShape = (
  value: unknown,
  path: string,
  keys: readonly string[],
): Record<string, unknown> => {
  if (value === null || value === undefined) {
    throw new RigInputError(`${path} is absent; a check cannot return a verdict from nothing`);
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new RigInputError(
      `${path} is ${Array.isArray(value) ? "an array" : typeof value}, expected an object`,
    );
  }
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length === 0) {
    throw new RigInputError(
      `${path} is empty. This is the Phase 9 defect verbatim: the ground truth was attached under a different key, every check read {} and scored it as a failure, and a correct subject appeared to fail everything.`,
    );
  }
  const missing = keys.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new RigInputError(`${path} is missing ${missing.join(", ")}; the rig is reading the wrong shape`);
  }
  return obj;
};

/**
 * The gate. Call this before reporting anything a rig produced.
 *
 * A degenerate result is permitted ONLY when controls ran in the same invocation and held. That is
 * the precise rule that separates Phase 9's real all-fail-against-the-mutant result, which is sound,
 * from Phase 9's first all-fail-against-the-reference result, which was fiction.
 */
export const rigIntegrity = (
  rigId: string,
  controls: readonly RigControl[],
  cells: readonly (readonly string[])[],
): RigVerdict => {
  const broken = controlsHold(controls);
  const degenerate = isDegenerate(cells);
  const reasons: string[] = [];

  if (controls.length === 0) {
    reasons.push(
      "no controls ran in this invocation, so nothing establishes that this rig can tell a passing subject from a failing one",
    );
  }
  for (const b of broken) reasons.push(`control inverted -- ${b}`);
  if (degenerate && controls.length === 0) {
    reasons.push(
      "every cell agrees, which is the shape a broken rig produces, and no control ran to rule that out",
    );
  }

  const usable = reasons.length === 0;
  if (usable && degenerate) {
    reasons.push(
      "every cell agrees, but the controls ran in this invocation and held, so the result is sound rather than degenerate",
    );
  }
  if (usable && !degenerate) reasons.push("controls held and the result discriminates");

  return { rigId, usable, reasons, brokenControls: broken, degenerate };
};
