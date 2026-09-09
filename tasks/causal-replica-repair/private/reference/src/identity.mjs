export const identity = (v) => JSON.stringify([v.site, v.n]);
export function contextUnion(states) {
  const c = {};
  for (const s of states) for (const [k, n] of Object.entries(s.context)) c[k] = Math.max(c[k] ?? 0, n);
  return c;
}
