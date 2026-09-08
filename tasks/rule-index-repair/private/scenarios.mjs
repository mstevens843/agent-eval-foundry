export const checkIds = ["completion", "semantics", "bounded_work", "positive_work", "legal_program"];
export function scenarios() {
  return Array.from({ length: 25 }, (_, n) => {
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
  });
}
