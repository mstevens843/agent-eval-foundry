export function canonical(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map((v) => JSON.parse(canonical(v))));
  if (value && typeof value === "object") return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map((k) => [k, JSON.parse(canonical(value[k]))])));
  return JSON.stringify(value);
}
export const equal = (a, b) => canonical(a) === canonical(b);
export const sorted = (xs) => [...xs].sort((a, b) => canonical(a).localeCompare(canonical(b)));
export function verdicts(cases, check) {
  return { verdicts: Object.fromEntries(cases.map(({ token, cells }) => {
    let ok;
    try { ok = cells.every(check); } catch { ok = false; }
    return [token, { ok }];
  })) };
}
