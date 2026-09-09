export const checkIds = ["completion", "semantics", "bounded_work", "positive_work", "legal_program"];
// Every case-000..023 rule set includes an unconditional "**" catch-all ("empty"/"fallback"),
// so truth is never genuinely null there -- a mutant that exceeds its work budget on some
// document always also fails `semantics` on that same document (the interpreter returns null on
// a budget cutoff, but truth is always some real match thanks to the catch-all), which is not an
// isolated bounded_work defect. This dedicated scenario has no catch-all: its near-miss document
// genuinely has no match at all (truth is null), so a budget cutoff's null return happens to
// equal the correct answer regardless of whether it was reached by exhaustive proof or an early
// timeout -- isolating the failure to work bound alone, exactly like the "no-memo" backtracking
// mutant this exists to catch (an isolated, correct-results-but-too-slow defect a checker must
// independently verify a candidate's work bound on, not infer from wrong output).
function boundedWorkScenario() {
  const pattern = "a*a*a*a*a*a*a*a*b";
  return {
    id: "case-025",
    rules: [{ id: "eight-groups", pattern, fold: false, tag: "primary" }],
    documents: ["aaaaaaaab", "aaaaaaaaaaaa"],
  };
}
export function scenarios() {
  return [
    ...Array.from({ length: 25 }, (_, n) => {
    if (n === 24)
      return {
        id: "case-024",
        rules: [{ id: "one", pattern: "abc", fold: false, tag: "plain" }],
        documents: ["abc", "ab", "abcd", ""],
      };
    const rules = [
      { id: "first", pattern: "A*?*Z", fold: !!(n & 1), tag: "primary" },
      { id: "escaped", pattern: "\\**\\?", fold: false, tag: "literal" },
      { id: "empty", pattern: "**", fold: false, tag: "fallback" },
    ];
    if (n & 2) rules.unshift({ id: "before", pattern: "a*", fold: true, tag: "earlier" });
    // A near-match exercises the full declared work bound without a wall-time timeout.
    rules.unshift({ id: "expansion", pattern: "*a*a*a*a*a*b", fold: !!(n & 4), tag: "exact" });
    const documents = [
      "AxxZ",
      "aXz",
      "*hello?",
      "",
      "z",
      "abc",
      "a".repeat(22 + (n % 6)),
      "a".repeat(12) + "b",
      "AaZ",
      "A?Z",
      "AAA",
      " ".repeat(8),
    ];
    if (n & 8) documents.reverse();
      return { id: "case-" + String(n).padStart(3, "0"), rules, documents };
    }),
    boundedWorkScenario(),
  ];
}
