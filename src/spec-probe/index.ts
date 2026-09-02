// The spec-only probe, as a standalone tool.
//
// Nothing under this directory imports anything else in this repository. That is enforced by
// test/spec-probe.test.ts and it is the point: the probe is the most transferable thing this project
// has built, and a benchmark author should be able to lift the directory, point it at their own
// verifier and their own specification, and get an answer.
//
// See README.md in this directory for the input contract and the measured validation numbers.

export { buildCorpus } from "./corpus.js";
export { type Adjudication, MIN_REASON_CHARS, loadAdjudications, probeGate, renderProbeGate } from "./gate.js";
export { blocking, probe, summarise } from "./probe.js";
export { renderProbeReport, renderSweep } from "./report.js";
export { directoryTarget, familyTarget, probeableFamilies, unprobeableFamilies } from "./targets.js";
export type {
  DetectorId,
  Finding,
  Language,
  ProbeFile,
  ProbeResult,
  ProbeTarget,
  Severity,
  SourceRef,
} from "./types.js";
