// The source layer: everything that can produce a normalized result matrix.
//
// The axis meter grades a `Matrix`. Where that matrix came from is deliberately not its problem, and
// this registry is where that boundary is made explicit rather than implied by which importer
// happens to be imported at the call site.
//
// Two design rules.
//
// FIRST, a planned source is declared, not stubbed. Every entry below is real and typed; the ones
// without an implementation carry `status: "planned"` and a `load` that throws with a message saying
// what would need building. The alternative -- a stub returning an empty matrix -- produces a report
// full of zeroes that looks like a measurement. This project's whole argument is that an unmeasured
// cell must never be mistaken for a measured one, and the same applies one level up: an unbuilt
// importer must never be mistaken for a corpus with no findings.
//
// SECOND, every source funnels through `parseMatrix`, so no importer can invent its own validation
// posture. That is what makes the checks uniform: duplicate subject ids, duplicated or unknown task
// ids, missing cells and the pass/not-measured distinction are enforced once, in the loader, for
// data that arrived from anywhere. `fixtures/invalid/matrices/` holds a known-bad document per rule.

import { importSweBenchVerified } from "../import-swebench.js";
import { parseMatrix } from "../matrix.js";
import type { Matrix } from "../types.js";

export interface SourceLoadOptions {
  readonly minResolved?: number;
  readonly limit?: number;
}

export interface MatrixSource {
  readonly id: string;
  readonly label: string;
  /** What shape of input it reads, and what a cell means once loaded. */
  readonly description: string;
  readonly status: "implemented" | "planned";
  /** What a `planned` source would require. Null for implemented ones. */
  readonly requires: string | null;
  readonly load: (raw: unknown, options?: SourceLoadOptions) => Matrix;
}

const notImplemented = (id: string, requires: string) => (): Matrix => {
  throw new Error(
    `source "${id}" is declared but not implemented. ${requires} Refusing rather than returning an empty matrix: a report full of zeroes reads as a finding.`,
  );
};

export const SOURCES: readonly MatrixSource[] = [
  {
    id: "manual",
    label: "Native matrix",
    description:
      "A hand-authored or externally-produced document of schema agent-eval-foundry/matrix@1. Cells " +
      "carry the named checks that failed; null means not measured.",
    status: "implemented",
    requires: null,
    load: (raw) => parseMatrix(raw),
  },
  {
    id: "durable-outbox",
    label: "Durable approval outbox (internal worked example)",
    description:
      "The shipped Terminal-Bench 3 task, 24 scenarios x 10 preserved engines, extracted from a " +
      "complete sweep of the real 267-check verifier. Native schema; loads through `manual`.",
    status: "implemented",
    requires: null,
    load: (raw) => parseMatrix(raw),
  },
  {
    id: "swebench",
    label: "SWE-bench Verified leaderboard",
    description:
      "500 instances x 134 independently submitted systems. `resolved` becomes a pass, `no_logs` " +
      "becomes not-measured, everything else a failure recorded as the check `unresolved`.",
    status: "implemented",
    requires: null,
    load: (raw, options) => importSweBenchVerified(raw, options ?? {}),
  },
  {
    id: "terminal-bench",
    label: "Terminal-Bench harness runs",
    description:
      "Per-task, per-agent verdicts from Harbor run output, with per-check detail from the CTRF " +
      "report each verifier emits.",
    status: "planned",
    requires:
      "It needs a reader for Harbor's run directory layout (result.json per trial) plus the CTRF " +
      "JSON the verifier writes to /logs/verifier/ctrf.json, which is where the per-check names live.",
    load: notImplemented(
      "terminal-bench",
      "It needs a reader for Harbor run directories and the per-verifier CTRF report.",
    ),
  },
  {
    id: "inspect",
    label: "UK AISI Inspect eval logs",
    description:
      "Per-sample scores from Inspect's .eval log format, which carries both the score and the " +
      "scorer that produced it.",
    status: "planned",
    requires:
      "It needs an .eval log reader and a decision about which scorer is authoritative when several " +
      "disagree — that disagreement is itself a measurable quantity and should not be flattened.",
    load: notImplemented(
      "inspect",
      "It needs an .eval log reader and a stated rule for resolving disagreeing scorers.",
    ),
  },
  {
    id: "agentdojo",
    label: "AgentDojo attack transcripts",
    description:
      "Per-(task, attack, pipeline) outcomes. Note this grades attack success rather than " +
      "implementation correctness, so a catch set means something different and reports must say so.",
    status: "planned",
    requires:
      "It needs the released transcript corpus and an explicit statement that a 'subject' here is a " +
      "defence pipeline, not an implementation under test.",
    load: notImplemented(
      "agentdojo",
      "It needs the released transcript corpus and a stated subject semantics.",
    ),
  },
  {
    id: "trial-ledger",
    label: "Model-trial ledger",
    description:
      "Trials this foundry ran itself, so a family's axis count can be recomputed as new engines " +
      "are added to the bank rather than frozen at authoring time.",
    status: "planned",
    requires:
      "It needs the runner to exist first. Declared here because the bank growing over time is the " +
      "thing that makes an axis count decay, and the decay is the finding.",
    load: notImplemented("trial-ledger", "It needs a runner that records trials in the first place."),
  },
];

export function getSource(id: string): MatrixSource {
  const found = SOURCES.find((s) => s.id === id);
  if (found === undefined) {
    throw new Error(`unknown source "${id}"; known: ${SOURCES.map((s) => s.id).join(", ")}`);
  }
  return found;
}

export const implementedSources = (): readonly MatrixSource[] =>
  SOURCES.filter((s) => s.status === "implemented");
