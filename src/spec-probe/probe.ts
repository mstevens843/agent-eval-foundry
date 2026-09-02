// The probe entry point, and the ranking that decides what a reader sees first.

import { buildCorpus } from "./corpus.js";
import {
  type Tally,
  detectMandatoryCalls,
  detectPrecedence,
  detectSetMembership,
  detectThresholds,
  detectTransitions,
} from "./detectors.js";
import { readHidden } from "./source.js";
import type { Finding, ProbeResult, ProbeTarget, Severity } from "./types.js";

const RANK: Readonly<Record<Severity, number>> = { high: 0, medium: 1, low: 2 };

/**
 * Cross-reference hidden decision code against visible prose.
 *
 * Deterministic and side-effect free: same inputs, same findings, no model, no network, no
 * execution of the code being read. That is what lets this be a gate. A screen whose output moves
 * between runs cannot block anything, because the first time it blocks a build someone will re-run
 * it, and the second answer will be the one that gets believed.
 */
export function probe(target: ProbeTarget): ProbeResult {
  const corpus = buildCorpus(target.visible);
  const tally: Tally = { extracted: 0 };
  const findings: Finding[] = [];

  for (const file of target.hidden) {
    const source = readHidden(file);
    findings.push(
      ...detectThresholds(source, corpus, tally),
      ...detectSetMembership(source, corpus, tally),
      ...detectTransitions(source, corpus, tally),
      ...detectPrecedence(source, corpus, tally),
      ...detectMandatoryCalls(source, corpus, tally),
    );
  }

  // A finding carrying a contradiction outranks one carrying only silence at the same severity:
  // visible text that asserts the opposite is strictly worse for the subject than visible text that
  // says nothing, and it is also the easier one for a reader to confirm or dismiss.
  findings.sort((a, b) => {
    const bySeverity = RANK[a.severity] - RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const byContradiction = Number(b.contradiction !== undefined) - Number(a.contradiction !== undefined);
    if (byContradiction !== 0) return byContradiction;
    return a.hidden.path.localeCompare(b.hidden.path) || a.hidden.line - b.hidden.line;
  });

  return {
    id: target.id,
    findings,
    scanned: { hidden: target.hidden.length, visible: target.visible.length },
    cleared: Math.max(0, tally.extracted - findings.length),
  };
}

/** Findings that should block a build. Everything else is advisory. */
export function blocking(result: ProbeResult): readonly Finding[] {
  return result.findings.filter((f) => f.severity === "high");
}

/**
 * A one-line verdict.
 *
 * `extracted 0` is reported explicitly because it is the failure mode that looks like success. A
 * probe pointed at the wrong files finds nothing and prints "clean", and nobody checks. If the probe
 * could not find a single commitment to test, that is a broken invocation, not a clean package.
 */
export function summarise(result: ProbeResult): string {
  const extracted = result.cleared + result.findings.length;
  if (extracted === 0) {
    return `${result.id}: NO COMMITMENTS EXTRACTED from ${result.scanned.hidden} hidden file(s) — the probe found nothing to test, which is not the same as finding nothing wrong`;
  }
  const high = result.findings.filter((f) => f.severity === "high").length;
  return `${result.id}: ${result.findings.length} finding(s) (${high} high) over ${extracted} commitment(s) checked, against ${result.scanned.visible} visible file(s)`;
}
