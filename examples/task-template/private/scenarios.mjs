export const checkIds = ["completion", "key_scope", "latest_value"];
export function scenarios() {
  const a = { key: "alpha", revision: 1, value: "old" };
  const b = { key: "alpha", revision: 2, value: "new" };
  const c = { key: "beta", revision: 0, value: "other" };
  return [
    { id: "ordered", records: [a, b, c] },
    { id: "reordered", records: [b, c, a] },
    { id: "duplicate", records: [b, b, a, c] },
    { id: "empty", records: [] },
    { id: "dictionary-keys", records: [
      { key: "__proto__", revision: 3, value: "latest" },
      { key: "__proto__", revision: 0, value: "stale" },
      { key: "constructor", revision: 0, value: "ordinary key" },
    ] },
  ];
}
