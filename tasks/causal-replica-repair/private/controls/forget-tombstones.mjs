export const identity = (v) => JSON.stringify([v.site, v.n]);
export function contextUnion(states) {
  const c = {};
  for (const s of states) for (const v of s.values) c[v.site] = Math.max(c[v.site] ?? 0, v.n);
  return c;
}
