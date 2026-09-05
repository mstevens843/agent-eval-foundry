// The independent verifier.
//
// Every check here enforces a clause that SPEC.md states. That is not decoration: Lane 0's
// enforcement screen ran eight rule-violating strategies against the Phase 16 metric set and five of
// them were caught by nothing at all - always-refuse, an age-eight off-by-one, a wrong `source`
// label, a reversed result order, and duplicate queries. Four of those are taxonomy class B1, the
// most common defect in this repository and the one nothing used to look for.

import { requireShape } from "../../screens/rig-integrity.js";
import { applicableAnswer, isStale } from "./truth.js";
import type { VerificationInput } from "./truth.js";
import type { Caa, CaaSource, IssuanceDecision, NameResult, OrderReport } from "./types.js";

export const CHECKS = [
  "caa_result_shape",
  "caa_per_name_binding",
  "caa_applicable_answer",
  "caa_safe_issuance",
  "caa_decision_faithful",
  "caa_positive_query_work",
] as const;

export type Check = (typeof CHECKS)[number];

/** Which rule code each check enforces. Read by the traceability gate, not by the grader. */
export const CHECK_RULES: Readonly<Record<Check, string>> = {
  caa_result_shape: "CAA4_ONE_RESULT_PER_NAME_IN_ORDER",
  caa_per_name_binding: "CAA1_RECHECK_EACH_STALE_NAME",
  caa_applicable_answer: "CAA2_FRESH_NAMES_USE_THEIR_OWN_CACHE",
  caa_safe_issuance: "CAA3_CONJUNCTIVE_ISSUANCE",
  caa_decision_faithful: "CAA3_CONJUNCTIVE_ISSUANCE",
  caa_positive_query_work: "CAA5_POSITIVE_QUERY_WORK",
};

export interface Failure {
  readonly check: Check;
  readonly detail: string;
}

const failure = (check: Check, detail: string): Failure => ({ check, detail });

const DECISIONS = new Set<IssuanceDecision>(["ISSUE", "REFUSE"]);
const ANSWERS = new Set<Caa>(["ALLOW", "DENY"]);
const SOURCES = new Set<CaaSource>(["CACHE", "CURRENT"]);

/**
 * Grammar refusal, separate from grading.
 *
 * A wrong-shaped report is a failure to measure, not a failing subject. `requireShape` raises for an
 * absent or empty structure; this raises for a well-formed object carrying values outside the
 * published grammar. Semantic mistakes - wrong order, wrong answer, wrong decision - are graded.
 */
export function requireOrderReport(value: unknown, path: string): OrderReport {
  const top = requireShape(value, path, ["decision", "results"]);
  if (!DECISIONS.has(top["decision"] as IssuanceDecision)) {
    throw new TypeError(`${path}.decision is ${JSON.stringify(top["decision"])}, expected ISSUE or REFUSE`);
  }
  if (!Array.isArray(top["results"])) throw new TypeError(`${path}.results must be an array`);
  for (const [index, entry] of (top["results"] as unknown[]).entries()) {
    const row = requireShape(entry, `${path}.results[${index}]`, ["fqdn", "caa", "source"]);
    if (typeof row["fqdn"] !== "string" || row["fqdn"].length === 0) {
      throw new TypeError(`${path}.results[${index}].fqdn must be a non-empty string`);
    }
    if (!ANSWERS.has(row["caa"] as Caa)) {
      throw new TypeError(`${path}.results[${index}].caa must be ALLOW or DENY`);
    }
    if (!SOURCES.has(row["source"] as CaaSource)) {
      throw new TypeError(`${path}.results[${index}].source must be CACHE or CURRENT`);
    }
  }
  return value as OrderReport;
}

export function verify(value: unknown): readonly Failure[] {
  const top = requireShape(value, "verification", ["scenario", "report", "queries"]);
  const scenario = requireShape(top["scenario"], "verification.scenario", ["view", "current", "params"]);
  requireShape(scenario["view"], "verification.scenario.view", ["orderId", "nowHour", "names"]);
  if (!Array.isArray(top["queries"])) throw new TypeError("verification.queries must be an array");
  requireOrderReport(top["report"], "verification.report");

  const input = value as VerificationInput;
  const names = input.scenario.view.names;
  const report = input.report;
  const queried = input.queries.map((query) => query.fqdn);
  const stale = names.filter((name) => isStale(input.scenario.view, name));
  const resultFor = (fqdn: string): NameResult | undefined => report.results.find((row) => row.fqdn === fqdn);
  const applicable = names.map((name) => applicableAnswer(input.scenario, name));
  const failures: Failure[] = [];

  // CAA4. One result per input name, in the input order.
  if (
    report.results.length !== names.length ||
    names.some((name, index) => report.results[index]?.fqdn !== name.fqdn)
  ) {
    failures.push(
      failure(
        "caa_result_shape",
        `expected ${names.length} results in input order, received ${report.results.length}: ${report.results.map((row) => row.fqdn).join(",")}`,
      ),
    );
  }

  // CAA1. Identity binding, judged on the host ledger rather than on the report's own account.
  const unbound = stale.filter((name) => !queried.includes(name.fqdn));
  if (unbound.length > 0) {
    failures.push(
      failure(
        "caa_per_name_binding",
        `${unbound.length} rechecked name(s) never reached the authority under their own fqdn: ${unbound.map((name) => name.fqdn).join(",")}`,
      ),
    );
  }

  // CAA1 and CAA2. Every name carries the answer the specification makes applicable to it.
  const wrongAnswer = names.filter((name, index) => resultFor(name.fqdn)?.caa !== applicable[index]);
  if (wrongAnswer.length > 0) {
    failures.push(
      failure(
        "caa_applicable_answer",
        `${wrongAnswer.length} name(s) do not carry their applicable answer: ${wrongAnswer.map((name) => name.fqdn).join(",")}`,
      ),
    );
  }

  // CAA3, both halves of the stated if-and-only-if.
  if (report.decision === "ISSUE" && applicable.includes("DENY")) {
    failures.push(failure("caa_safe_issuance", "issued an order in which a name's applicable answer denies"));
  }
  if (report.decision === "REFUSE" && applicable.every((answer) => answer === "ALLOW")) {
    failures.push(
      failure("caa_decision_faithful", "refused an order in which every name's applicable answer allows"),
    );
  }

  // CAA5. Conditioned on the order containing a rechecked name, so it cannot fire vacuously.
  if (stale.length > 0 && queried.length === 0) {
    failures.push(
      failure("caa_positive_query_work", "the order contains a rechecked name and no query reached the host"),
    );
  }
  return failures;
}
