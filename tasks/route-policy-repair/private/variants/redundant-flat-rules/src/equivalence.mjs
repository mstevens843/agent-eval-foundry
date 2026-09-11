import { cidr, matches, evaluateTarget } from "./target.mjs";
export function vocabulary(config, request) {
  const tags = new Set(request.match.communities ?? []);
  for (const p of Object.values(config.policies))
    for (const t of [...p.terms, { action: p.fallback }]) {
      for (const c of [...(t.match?.communities ?? []), ...(t.action.add ?? []), ...(t.action.remove ?? [])])
        tags.add(c);
    }
  return [...tags].sort();
}
// Prefix predicates are constant within these finite equivalence regions at each length.
export function prefixWitnesses(source, request, target) {
  const filters = [
    request.match,
    ...Object.values(source.policies).flatMap((p) => p.terms.map((t) => t.match)),
    ...Object.values(target.egresses).flatMap((rs) => rs.flatMap((r) => [...r.when.all, ...r.when.none])),
  ];
  const bounds = new Set([0, 2 ** 32]);
  for (const m of filters) {
    const c = cidr(m.prefix ?? "0.0.0.0/0");
    bounds.add(c.number);
    bounds.add(c.number + c.size);
  }
  const seen = new Set(),
    result = [];
  for (let length = 0; length <= 32; length++) {
    const size = 2 ** (32 - length);
    for (const n of bounds) {
      const address = Math.ceil(n / size) * size;
      if (address >= 2 ** 32) continue;
      const ip =
        [24, 16, 8, 0].map((shift) => Math.floor(address / 2 ** shift) % 256).join(".") + "/" + length;
      const signature = filters
        .map((m) => matches({ ...m, communities: [] }, { prefix: ip, communities: [] }))
        .join(",");
      if (!seen.has(signature)) {
        seen.add(signature);
        result.push(ip);
      }
    }
  }
  return result;
}
export function equivalent(source, request, target, interpret) {
  const tags = vocabulary(source, request),
    prefixes = prefixWitnesses(source, request, target);
  for (const prefix of prefixes)
    for (let mask = 0; mask < 2 ** tags.length; mask++) {
      const communities = tags.filter((_, i) => mask & (2 ** i));
      for (const preference of [0, 1000])
        for (const egress of Object.keys(source.egresses)) {
          const route = { prefix, preference, communities },
            original = interpret(source, egress, route);
          const expected =
            original.decision === "accept" &&
            request.egresses.includes(egress) &&
            matches(request.match, route)
              ? { ...original, preference: request.preference }
              : original;
          if (JSON.stringify(evaluateTarget(target, egress, route)) !== JSON.stringify(expected))
            return false;
        }
    }
  return true;
}
