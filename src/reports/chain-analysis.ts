// When more trials stop being more evidence.
//
// WHY THIS EXISTS
//
// The UI family has four counted trials from two labs — 33, 46, 62 and 90 failing scenarios — and
// every pair nests: 33 ⊂ 46 ⊂ 62 ⊂ 90. Under this repository's own axis meter that is ONE axis
// observed at four sensitivities, not four failure modes. The family separates subjects perfectly
// and has never been shown to measure more than one thing.
//
// That is a fact a pass-rate table cannot express and a reader will not derive. Four runs, four
// different numbers, two labs: it reads as rich. It is a chain.
//
// The consequence is operational, which is why this is a module and not a paragraph:
//
//   ADDING SUBJECTS CANNOT HELP. A chain stays a chain however many implementations are laid along
//   it. The width of a totally-ordered family of sets is 1 by definition. Spending on a fifth model
//   buys a fifth point on the same line.
//
//   ONLY SCENARIOS CAN HELP, and only scenarios of a particular shape: ones where the strategy that
//   wins the existing scenarios LOSES. If every scenario rewards the same disposition — here,
//   bailing out early — then a stricter implementation dominates a looser one everywhere and the
//   catch sets are forced to nest. Breaking a chain requires a genuine trade-off in the task.
//
// So this module does three things: detect the chain, prove that subjects cannot fix it, and locate
// the region of the declared space where an incomparable catch set could exist.

import { measure } from "../axis-meter.js";
import { fail } from "../foundry/schema.js";
import { parseMatrix } from "../matrix.js";

export interface SubjectFailures {
  readonly subjectId: string;
  readonly providerFamily: string;
  /** Scenario ids this subject failed, union over its counted trials. */
  readonly failed: ReadonlySet<string>;
  readonly graded: number;
}

export type PairRelation = "identical" | "nested" | "overlapping" | "disjoint";

export interface SubjectPair {
  readonly a: string;
  readonly b: string;
  readonly sizeA: number;
  readonly sizeB: number;
  readonly shared: number;
  readonly relation: PairRelation;
  readonly crossLab: boolean;
}

export interface ChainAnalysis {
  readonly familyId: string;
  readonly subjects: readonly string[];
  readonly pairs: readonly SubjectPair[];
  /** True when EVERY pair is identical or nested: the family measures one axis, whatever its size. */
  readonly isChain: boolean;
  /** The subjects in chain order, weakest first, when a chain exists. */
  readonly order: readonly string[];
  /** Pairs that are incomparable — the only thing that can raise the width above 1. */
  readonly incomparable: readonly SubjectPair[];
  /**
   * The MEASURED antichain width over the counted failing subjects, or null when it is not
   * measurable — which is the honest answer for a bank with a single failing subject.
   *
   * This was a constant until it was caught: `failing.length === 0 ? 0 : isChain ? 1 : 2`, printed
   * beside genuine antichain widths as though it had been measured. Its worst reading was the one
   * that shipped: a family with ONE failing subject is not a chain (a chain needs two), so it fell
   * through to the literal 2 and three families published "agent axes >= 2" on the strength of a
   * single failing subject each.
   */
  readonly agentAxes: number | null;
  /**
   * The ceiling this bank can support, which is how many subjects have failed anything.
   *
   * A width is bounded by the bank it was measured over, and a small bank cannot tell a genuinely
   * two-axis family from a two-subject accident. The bound travels with the number so the reader
   * never has to reconstruct it.
   */
  readonly agentAxesBoundedBy: number;
  /** The width and its bound, ready to print. Never a bare number, never a `>=` on a constant. */
  readonly agentAxesReading: string;
  readonly reading: string;
}

const relationOf = (
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
): { relation: PairRelation; shared: number } => {
  let shared = 0;
  for (const id of a) if (b.has(id)) shared += 1;
  if (a.size === 0 && b.size === 0) return { relation: "identical", shared };
  if (shared === 0) return { relation: "disjoint", shared };
  if (shared === a.size && shared === b.size) return { relation: "identical", shared };
  if (shared === a.size || shared === b.size) return { relation: "nested", shared };
  return { relation: "overlapping", shared };
};

export function analyseChain(familyId: string, subjects: readonly SubjectFailures[]): ChainAnalysis {
  const failing = subjects
    .filter((s) => s.failed.size > 0)
    .sort((a, b) => a.subjectId.localeCompare(b.subjectId));
  const pairs: SubjectPair[] = [];
  for (let i = 0; i < failing.length; i += 1) {
    for (let j = i + 1; j < failing.length; j += 1) {
      const a = failing[i];
      const b = failing[j];
      if (a === undefined || b === undefined) continue;
      const { relation, shared } = relationOf(a.failed, b.failed);
      pairs.push({
        a: a.subjectId,
        b: b.subjectId,
        sizeA: a.failed.size,
        sizeB: b.failed.size,
        shared,
        relation,
        crossLab: a.providerFamily !== b.providerFamily,
      });
    }
  }
  const incomparable = pairs.filter((p) => p.relation === "overlapping" || p.relation === "disjoint");
  const isChain = failing.length > 1 && incomparable.length === 0;
  const order = isChain
    ? [...failing].sort((a, b) => a.failed.size - b.failed.size).map((s) => s.subjectId)
    : [];

  const agentAxes = measuredAgentAxes(failing);
  const agentAxesReading =
    agentAxes === null
      ? `not measurable — ${failing.length} counted failing subject`
      : agentAxes === 0
        ? "0 — no counted subject has failed anything"
        : `${agentAxes} (bounded above by the ${failing.length}-subject bank)`;

  const reading = isChain
    ? `Every pair of counted failing subjects nests: ${order
        .map((s, i) => (i === 0 ? `\`${s}\`` : `⊂ \`${s}\``))
        .join(
          " ",
        )}. The failure sets are totally ordered, so the family measures ONE thing at ${order.length} sensitivities. Adding subjects cannot change this — a chain stays a chain however many implementations are laid along it — so the only lever is new scenarios.`
    : failing.length < 2
      ? "Fewer than two subjects have failed anything, so there is no chain to detect yet. This is not evidence of breadth."
      : `${incomparable.length} pair(s) are incomparable, so the family separates subjects in more than one direction and its width is above 1. That is what a family measuring several things looks like.`;

  return {
    familyId,
    subjects: failing.map((s) => s.subjectId),
    pairs,
    isChain,
    order,
    incomparable,
    agentAxes,
    agentAxesBoundedBy: failing.length,
    agentAxesReading,
    reading,
  };
}

/**
 * The width, measured, by the same meter every other axis count in this repository goes through.
 *
 * `measure` grades a matrix, so the subject-by-scenario failure sets are turned into one: instances
 * are the scenarios anybody failed, subjects are the failing subjects, and a cell fails when that
 * subject failed that scenario. `independentAxes` is then the antichain width over the instances'
 * catch sets, which is the same quantity `shared-difficulty.ts` reports for combined banks and the
 * same one the mutant-bank axis counts are.
 *
 * It agrees with the chain relation at both ends and is strictly more informative in between: if
 * every subject's failure set nests, every catch set is an up-set of one order and the width is 1;
 * if any pair is incomparable there are two scenarios separating them in opposite directions and the
 * width is at least 2. What the old constant could not do is distinguish 2 from 5.
 *
 * One failing subject returns null rather than 1. The width over a one-subject bank is 1 whatever
 * the family does, so the number would be a fact about the bank size wearing a measurement's name —
 * the exact mistake this module exists to catch.
 */
function measuredAgentAxes(failing: readonly SubjectFailures[]): number | null {
  if (failing.length === 0) return 0;
  if (failing.length === 1) return null;
  const scenarioIds = [...new Set(failing.flatMap((s) => [...s.failed]))].sort();
  if (scenarioIds.length === 0) return 0;

  const results: Record<string, Record<string, { failed: string[] }>> = {};
  for (const scenarioId of scenarioIds) {
    const row: Record<string, { failed: string[] }> = {};
    for (const subject of failing) {
      row[subject.subjectId] = { failed: subject.failed.has(scenarioId) ? ["failed"] : [] };
    }
    results[scenarioId] = row;
  }

  return measure(
    parseMatrix({
      schema: "agent-eval-foundry/matrix@1",
      suite: "counted-agent-failures",
      provenance: {
        repo: "agent-eval-foundry",
        artifact_commit: null,
        task_sha256: null,
        suite_shape: `${scenarioIds.length} failed scenario(s) / ${failing.length} counted failing subject(s)`,
        checks_total: scenarioIds.length,
        checks_declared: null,
        extracted_from: ["counted agent trial records"],
        caveat:
          "Cells are the union of failures across a subject's counted trials, restricted to the " +
          "scenarios at least one subject failed. Scenarios nobody failed are omitted: their catch " +
          "set is empty, which is nested inside every other and cannot change the width.",
      },
      reference_subject: null,
      subjects: failing.map((s) => ({
        id: s.subjectId,
        label: s.subjectId,
        family: s.providerFamily,
        model: s.subjectId,
        effort: null,
        note: null,
      })),
      instances: scenarioIds.map((id) => ({
        id,
        schedule: null,
        seed: null,
        keys: null,
        family: null,
        source: "counted-agent-trial",
        note: null,
      })),
      results,
    }),
  ).independentAxes;
}

// ---------------------------------------------------------------- where a new axis could live

export interface KnobRegion {
  readonly knob: string;
  readonly value: string;
  readonly scenarios: number;
  /** Failure rate per subject at this knob value. */
  readonly perSubject: Readonly<Record<string, number>>;
  /** Every subject fails here, or none does — either way it cannot separate them. */
  readonly separating: boolean;
}

export interface DiversityTarget {
  readonly familyId: string;
  readonly regions: readonly KnobRegion[];
  /** Knob values where NO subject fails: the space is declared and nothing exercises it. */
  readonly untouched: readonly KnobRegion[];
  /** Knob values every failing subject fails: saturated, and contributing nothing to width. */
  readonly saturated: readonly KnobRegion[];
}

/**
 * Which parts of the declared space are doing separating work, and which are dead weight.
 *
 * A region every subject fails and a region no subject fails are the same thing from the meter's
 * point of view: neither distinguishes anything. Naming both is how a diversity upgrade gets a
 * target instead of an intention.
 */
export function diversityTargets(
  familyId: string,
  subjects: readonly SubjectFailures[],
  params: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): DiversityTarget {
  const failing = subjects.filter((s) => s.failed.size > 0);
  const knobs = new Set<string>();
  for (const p of params.values()) for (const k of Object.keys(p)) knobs.add(k);

  const regions: KnobRegion[] = [];
  for (const knob of [...knobs].sort()) {
    const byValue = new Map<string, string[]>();
    for (const [scenarioId, p] of params) {
      const value = String(p[knob] ?? "—");
      byValue.set(value, [...(byValue.get(value) ?? []), scenarioId]);
    }
    for (const [value, ids] of [...byValue.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const perSubject: Record<string, number> = {};
      for (const s of failing) {
        const hit = ids.filter((id) => s.failed.has(id)).length;
        perSubject[s.subjectId] = ids.length === 0 ? 0 : hit / ids.length;
      }
      const rates = Object.values(perSubject);
      const allFail = rates.length > 0 && rates.every((r) => r >= 0.999);
      const noneFail = rates.every((r) => r === 0);
      regions.push({
        knob,
        value,
        scenarios: ids.length,
        perSubject,
        separating: !allFail && !noneFail && rates.length > 1,
      });
    }
  }

  return {
    familyId,
    regions,
    untouched: regions.filter((r) => Object.values(r.perSubject).every((v) => v === 0)),
    saturated: regions.filter(
      (r) => Object.values(r.perSubject).length > 1 && Object.values(r.perSubject).every((v) => v >= 0.999),
    ),
  };
}

/**
 * A family whose subjects form a chain may not have its subject count quoted as breadth.
 *
 * The guard for the specific misreading this module exists to prevent: five trials, four subjects,
 * two labs and four different failure counts read as four measurements, and they are one. The check
 * is cheap and the mistake is not — it is the difference between "this family separates models" and
 * "this family measures four things", and only the first is true.
 */
export function assertChainNotQuotedAsBreadth(analysis: ChainAnalysis, claimedAxes: number): void {
  if (analysis.isChain && claimedAxes > 1) {
    fail(
      "CHAIN_QUOTED_AS_BREADTH",
      `chain.${analysis.familyId}`,
      `${claimedAxes} axes were claimed over ${analysis.subjects.length} subjects whose failure sets are totally ordered (${analysis.order.join(" ⊂ ")}). A chain has width 1 by definition: every subject differs from the next only in sensitivity to the same underlying defect, so the count is the bank size wearing a measurement's name.`,
    );
  }
}
