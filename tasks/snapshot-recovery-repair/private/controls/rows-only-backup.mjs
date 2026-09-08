export function encode(v, s) {
  return Buffer.from(
    JSON.stringify({
      tenant: v.tenant,
      branch: v.branch,
      cutoff: v.cutoff,
      ...s,
      entries: s.entries.map((r) => ({ ...r, amount: Math.abs(r.amount) + 1 })),
    }),
  ).toString("base64");
}
