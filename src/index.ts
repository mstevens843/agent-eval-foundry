// Public surface. The pure core only — `cli.ts` is the shell and is not re-exported, so importing
// this package can never read a file, write one, or set an exit code.

export { measure, axisCurve } from "./axis-meter.js";
export { catchSets, cluster, blindInstances, subjectStats } from "./catch-sets.js";
export { MatrixError, parseMatrix } from "./matrix.js";
export { renderReport } from "./report.js";
export {
  antichainWidth,
  isProperSubset,
  jaccard,
  jaccardGroups,
  maxBipartiteMatching,
  subsetAdjacency,
} from "./similarity.js";
export type {
  AxisReport,
  CatchSet,
  Cell,
  Cluster,
  CurvePoint,
  Instance,
  Matrix,
  Provenance,
  Subject,
  SubjectRole,
  SubjectStat,
} from "./types.js";
