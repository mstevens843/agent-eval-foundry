import { makeSubject } from "./reference.js";
import type { NameResult, Subject } from "./types.js";

/** The incident itself: N queries, N results, one fqdn checked N times. */
export const firstNameReuse = makeSubject(
  "first-name-reuse",
  "Query the first stale name once per stale list position",
  { bindQueryPerName: false },
);

/** Off-by-one on the recheck window in the strict direction: age eight treated as stale. */
export const boundaryInclusive = makeSubject(
  "boundary-inclusive",
  "Recheck at age eight as well as above it",
  { staleAboveHours: 7 },
);

/** Off-by-one in the lenient direction: age nine treated as fresh. */
export const boundaryLenient = makeSubject("boundary-lenient", "Recheck only above age nine", {
  staleAboveHours: 9,
});

/** Cardinality preserved, identity discarded, answers taken from the cache. */
export const cardinalityOnlyQueries = makeSubject(
  "cardinality-only-queries",
  "Make the right number of calls against one name and report the cache",
  { bindQueryPerName: false, reportQueriedAnswer: false },
);

/** Correct answers, wrong order. */
export const reversedOrder = makeSubject("reversed-order", "Correct answers emitted in reverse order", {
  preserveOrder: false,
});

/** Baseline: touches nothing external. */
export const noQuery = makeSubject("no-query", "Never call the authority; report the cache", {
  callAuthority: false,
});

/** Cheat oracle: does the honest work, then refuses unconditionally. */
export const alwaysRefuse = makeSubject("always-refuse", "Do the work, then refuse every order", {
  decideFromAnswers: "always-refuse",
});

/** Cheat oracle: does the honest work, then issues unconditionally. */
export const alwaysIssue = makeSubject("always-issue", "Do the work, then issue every order", {
  decideFromAnswers: "always-issue",
});

/** Cheat oracle: plausible CURRENT results with no matching host query. */
export const fabricatedResult: Subject = {
  id: "fabricated-result",
  label: "Emit plausible current results without querying the authority",
  run(view) {
    const results: NameResult[] = view.names.map((name) => ({
      fqdn: name.fqdn,
      caa: "ALLOW",
      source: "CURRENT",
    }));
    return { decision: "ISSUE", results };
  },
};

export const MUTANTS: readonly Subject[] = [
  firstNameReuse,
  boundaryInclusive,
  boundaryLenient,
  cardinalityOnlyQueries,
  reversedOrder,
  noQuery,
  alwaysRefuse,
  alwaysIssue,
  fabricatedResult,
];

export const BASELINES = ["no-query"] as const;

export const CHEAT_ORACLES = ["no-query", "always-refuse", "always-issue", "fabricated-result"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "first-name-reuse": "caa_per_name_binding",
  "boundary-inclusive": "caa_applicable_answer",
  "boundary-lenient": "caa_per_name_binding",
  "cardinality-only-queries": "caa_per_name_binding",
  "reversed-order": "caa_result_shape",
  "no-query": "caa_positive_query_work",
  "always-refuse": "caa_decision_faithful",
  "always-issue": "caa_safe_issuance",
  "fabricated-result": "caa_per_name_binding",
};
