export function integrate(rows, q) {
  return rows
    .reduce(
      (total, row) =>
        total + BigInt(Math.max(0, Math.min(row.to, q.to) - Math.max(row.from, q.from))) * BigInt(row.value),
      0n,
    )
    .toString();
}
