export const checkIds = ["completion", "exact_integral", "population", "unique_reports"];
export function scenarios() {
  const cases = [];
  for (let seed = 0; seed < 32; seed++) {
    const shift = seed % 4,
      huge = seed % 2 === 1,
      retracted = (seed >> 1) % 2 === 1,
      moved = (seed >> 2) % 2 === 1;
    const rows = [
      {
        series: "A",
        key: "x",
        revision: 1,
        knownAt: 0,
        from: 0,
        to: 8,
        value: huge ? "9007199254740993" : "3",
      },
      {
        series: "A",
        key: "x",
        revision: 2,
        knownAt: 4,
        from: moved ? 12 : 2,
        to: moved ? 16 : 7,
        value: retracted ? null : "11",
      },
      { series: "A", key: "y", revision: 1, knownAt: 1, from: 3, to: 9, value: "5" },
      { series: "B", key: "x", revision: 1, knownAt: 0, from: 0, to: 9, value: "99" },
      { series: "A", key: "x", revision: 3, knownAt: 20, from: 0, to: 8, value: "30" },
    ].map((r) => ({ ...r, from: r.from + shift, to: r.to + shift }));
    if (seed % 2) rows.reverse();
    if (seed % 3 === 0)
      rows.push({ series: "A", key: "z", revision: 1, knownAt: 0, from: -2, to: 0, value: "7" });
    cases.push({
      id: "case-" + String(seed).padStart(3, "0"),
      rows,
      pageSize: 1 + (seed % 3),
      queries: [
        { id: "now", series: "A", knownAt: 5, from: shift, to: 8 + shift },
        { id: "then", series: "A", knownAt: 0, from: shift, to: 8 + shift },
        { id: "edge", series: "A", knownAt: 5, from: 8 + shift, to: 12 + shift },
        { id: "other", series: "B", knownAt: 5, from: shift, to: 2 + shift },
        { id: "empty", series: "C", knownAt: 30, from: 0, to: 3 },
      ],
    });
  }
  cases.push({
    id: "case-032",
    pageSize: 1,
    rows: [{ series: "A", key: "one", revision: 1, knownAt: 0, from: 0, to: 4, value: "3" }],
    queries: [{ id: "normal", series: "A", knownAt: 2, from: 0, to: 4 }],
  });
  cases.push({ id: "case-033", pageSize: 1, rows: [], queries: [{ id: "empty", series: "empty", knownAt: 0, from: 0, to: 1 }] });
  return cases;
}
