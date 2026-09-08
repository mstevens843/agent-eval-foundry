export function integrate(rows, q) {
  return String(
    rows.reduce(
      (a, r) => a + Math.max(0, Math.min(r.to, q.to) - Math.max(r.from, q.from)) * Number(r.value),
      0,
    ),
  );
}
