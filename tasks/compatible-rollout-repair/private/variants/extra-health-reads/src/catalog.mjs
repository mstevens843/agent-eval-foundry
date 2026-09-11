export function choose(releases, service) {
  return [...releases].filter((r) => r.abi === service.abi).sort((a, b) => b.rank - a.rank)[0] ?? null;
}
