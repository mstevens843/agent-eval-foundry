// Phase 23 Lane 1 bonus — closing authoritative-state-inaccessible-to-subject's remaining half.
//
// This operator's own record (data/phase-21-operators.json) already carries evidenceStatus:"measured"
// for the adversarial/exploit case (Phase 20: does a malicious submission forge a pass by reaching the
// ledger?). What was never measured: does an ORDINARY, HONEST submission's grade differ at all between
// the pre-Phase-20 route (submission and ledger sharing one process, no network) and the post-Phase-20
// route (submission and ledger in separate signed, framed processes)? The operator's own causal claim
// says this should be null for a compliant submission — that null has never actually been checked.
//
// This does not fit src/phase-22's orchestrator (there is no scenario selection, no mutant bank, no
// naive/targeted arm here — the "delta" is which grading ROUTE the exact same submission runs through).
// Building a full second orchestrator for a two-route comparison would be more machinery than the
// question needs. This is a small, purpose-built check instead, reusing exactly the same four
// preserved, hash-verified-compatible real Phase 17 submissions Phase 22 already validated — zero new
// spend, zero new agent trials, real Docker both routes.

import { gradeCaaRevalidation, gradeCaaRevalidationInContainer } from "../trials/router.js";
import type { GradeResult } from "../trials/router.js";

export interface RouteParityDiscrepancy {
  readonly scenarioId: string;
  readonly preRouteFailed: readonly string[];
  readonly postRouteFailed: readonly string[];
}

export interface RouteParityResult {
  readonly submissionId: string;
  readonly modulePath: string;
  readonly preRouteHostErrors: number;
  readonly postRouteHostErrors: number;
  readonly preRouteCellCount: number;
  readonly postRouteCellCount: number;
  readonly identical: boolean;
  readonly discrepancies: readonly RouteParityDiscrepancy[];
}

const failedFor = (result: GradeResult): ReadonlyMap<string, readonly string[]> =>
  new Map(result.cells.map((cell) => [cell.scenarioId, [...cell.failed].sort()]));

/**
 * Grade the SAME preserved submission through both the pre- and post-Phase-20 routes, for real, and
 * diff the result cell by cell. `identical:true` is the operator's predicted null; any discrepancy is
 * itself the finding (this operator changes what a submission can get away with), not a bug in this
 * check.
 */
export function checkRouteParity(submissionId: string, modulePath: string): RouteParityResult {
  const preRoute = gradeCaaRevalidationInContainer(modulePath);
  const postRoute = gradeCaaRevalidation(modulePath);

  const preFailed = failedFor(preRoute);
  const postFailed = failedFor(postRoute);
  const scenarioIds = new Set([...preFailed.keys(), ...postFailed.keys()]);

  const discrepancies: RouteParityDiscrepancy[] = [];
  for (const scenarioId of [...scenarioIds].sort()) {
    const pre = preFailed.get(scenarioId) ?? [];
    const post = postFailed.get(scenarioId) ?? [];
    if (pre.join(",") !== post.join(",")) {
      discrepancies.push({ scenarioId, preRouteFailed: pre, postRouteFailed: post });
    }
  }

  return {
    submissionId,
    modulePath,
    preRouteHostErrors: preRoute.hostErrors,
    postRouteHostErrors: postRoute.hostErrors,
    preRouteCellCount: preRoute.cells.length,
    postRouteCellCount: postRoute.cells.length,
    identical:
      discrepancies.length === 0 &&
      preRoute.hostErrors === postRoute.hostErrors &&
      preRoute.cells.length === postRoute.cells.length,
    discrepancies,
  };
}
