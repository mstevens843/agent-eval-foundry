export function integrate(rows, q) {
  return String(
    rows.reduce(
      (a, r) =>
        a + BigInt(Math.max(0, Math.min(r.to, q.to) - Math.max(r.from, q.from) + 1)) * BigInt(r.value),
      0n,
    ),
  );
}
