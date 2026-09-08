export const checkIds = ["completion", "causal_values", "causal_context", "preservation"];
export function scenarios() {
  const cases = Array.from({ length: 32 }, (_, seed) => {
    const n = 1 + (seed % 3),
      replicas = seed % 2 ? ["north", "south", "west"] : ["north", "south"];
    const a = { site: "author", n, payload: "old" },
      b = { site: "reviewer", n: 1, payload: seed % 4 === 0 ? "old" : "concurrent" };
    const documents = {};
    for (const [i, r] of replicas.entries())
      documents[r] = {
        article: {
          // "retired" is a context-only entry with no corresponding value anywhere -- the one
          // fixture exercising SEMANTICS.md's "Result context is the componentwise maximum,
          // including sites with no live values" independently of any value-level tombstone.
          // It must not be tied to `seed % 2` (which also selects replica count for unrelated
          // reasons): that coupling meant every 2-replica scenario -- exactly the scenarios a
          // default small grading subset tends to land on -- carried no case where a
          // values-derived context computation (ignoring the state's own recorded `context`)
          // reads identically to the correct componentwise-max one. Unconditional here so the
          // fixture is present regardless of replica count or which scenarios get sampled.
          context: { author: n, ...(i > 0 ? { reviewer: 1 } : {}), retired: 9 },
          values: i === 0 ? [a] : seed & 2 ? [b] : [a, b],
        },
        archive: { context: { author: n }, values: i === 0 ? [a] : [] },
        untouched: { context: { private: 1 }, values: [{ site: "private", n: 1, payload: r }] },
      };
    if (seed & 4) delete documents[replicas[0]].article;
    // A genuine concurrent edit from the first replica must reach the others too.
    // Merely repairing the first replica cannot converge this population.
    if (seed & 16) {
      const article = (documents[replicas[0]].article ??= { context: {}, values: [] });
      article.context.offline = 1;
      article.values.push({ site: "offline", n: 1, payload: "independent" });
    }
    if (seed & 8) replicas.reverse();
    return {
      id: "case-" + String(seed).padStart(3, "0"),
      replicas,
      scope: ["article", "archive", "new"],
      documents,
    };
  });
  const state = { context: { a: 1 }, values: [{ site: "a", n: 1, payload: "value" }] };
  cases.push({
    id: "case-032",
    replicas: ["east", "west"],
    scope: ["doc"],
    documents: { east: { doc: state }, west: { doc: state } },
  });
  return cases;
}
