// The measurement itself, and the reason it is reported as a curve rather than a number.
//
// A suite's apparent diversity is not a property of the suite. It is a property of the suite paired
// with the bank of subjects you measure it against, and it falls as the bank gets stronger. Against
// a bank of very weak implementations almost every instance catches almost everything, so catch sets
// look large and varied and the suite looks rich. Against a bank of near-correct implementations
// only the genuinely discriminating instances fire at all, and most of the apparent variety
// evaporates.
//
// That is not a defect in the measurement, it is the finding. A benchmark reporting "N tasks" is
// making a claim that only holds against some unstated population of subjects, and the honest way to
// state the claim is to show how it decays: drop the weakest subject, recount; drop the next, recount.
// The shape of that curve says whether a suite will survive the next model generation. A suite whose
// measurement count collapses the moment the weakest engines are removed is a suite already close to
// exhausted, however many tasks it contains.
//
// "Weakest" here means most-caught: the subject that the largest number of instances separate from
// correct. That is a within-suite proxy for capability, not an external ranking, and it is the only
// one available from a matrix alone. Where an external ranking exists it should be preferred; the
// curve accepts an explicit order for exactly that reason.

import { cluster, blindInstances, catchSets, subjectStats } from "./catch-sets.js";
import { antichainWidth } from "./similarity.js";
import type { AxisReport, CurvePoint, Matrix } from "./types.js";

const distinctSets = (matrix: Matrix, scope: readonly string[]): readonly (readonly string[])[] => {
  const seen = new Map<string, readonly string[]>();
  for (const s of catchSets(matrix, scope)) {
    if (s.caught.length === 0) continue;
    seen.set(s.caught.join(" "), s.caught);
  }
  return [...seen.values()];
};

/**
 * The decay curve. Point k reports what the suite still measures after removing the k most-caught
 * subjects. Stops one short of emptying the bank, since a zero-subject bank measures nothing by
 * construction and the point carries no information.
 */
export function axisCurve(matrix: Matrix, explicitOrder?: readonly string[]): readonly CurvePoint[] {
  const stats = subjectStats(matrix, catchSets(matrix));
  const weakestFirst =
    explicitOrder ?? stats.filter((s) => s.role !== "never-caught").map((s) => s.subjectId);
  const neverCaught = stats.filter((s) => s.role === "never-caught").map((s) => s.subjectId);

  const points: CurvePoint[] = [];
  for (let k = 0; k < weakestFirst.length; k += 1) {
    const remaining = [...weakestFirst.slice(k), ...neverCaught];
    const sets = catchSets(matrix, remaining);
    const distinct = distinctSets(matrix, remaining);
    points.push({
      droppedWeakest: k,
      remainingSubjects: remaining,
      distinctMeasurements: distinct.length,
      independentAxes: antichainWidth(distinct).width,
      blindInstances: blindInstances(sets).length,
    });
  }
  return points;
}

/** Run the full measurement over a matrix. Pure: no I/O, no clock, no randomness. */
export function measure(matrix: Matrix): AxisReport {
  const scope = matrix.subjects.map((s) => s.id);
  const sets = catchSets(matrix, scope);
  const clusters = cluster(sets);
  const distinct = clusters.map((c) => c.caught);
  const { width, chains } = antichainWidth(distinct);

  let measuredCells = 0;
  let unmeasuredCells = 0;
  for (const inst of matrix.instances) {
    const row = matrix.results[inst.id] ?? {};
    for (const sid of scope) {
      if (row[sid] === null || row[sid] === undefined) unmeasuredCells += 1;
      else measuredCells += 1;
    }
  }

  const blind = blindInstances(sets);
  const discriminatingCount = matrix.instances.length - blind.length;

  return {
    suite: matrix.suite,
    provenance: matrix.provenance,
    instanceCount: matrix.instances.length,
    subjectCount: matrix.subjects.length,
    measuredCells,
    unmeasuredCells,
    blindInstances: blind,
    clusters,
    distinctMeasurements: distinct.length,
    independentAxes: width,
    chains: chains.map((chain) => chain.map((s) => `{${s.join(",")}}`)),
    subjectStats: subjectStats(matrix, sets),
    curve: axisCurve(matrix),
    redundancy: distinct.length === 0 ? 0 : discriminatingCount / distinct.length,
  };
}
