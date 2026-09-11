// Deployment evaluator; this implements the target runtime, not the migration.
export function cidr(text) {
  if (typeof text !== "string") throw Error("prefix");
  const [address, length, ...rest] = text.split("/"),
    octets = address.split(".");
  if (
    rest.length ||
    !/^([0-9]|[12][0-9]|3[0-2])$/.test(length) ||
    octets.length !== 4 ||
    octets.some((x) => !/^([0-9]|[1-9][0-9]{1,2})$/.test(x) || +x > 255)
  )
    throw Error("prefix");
  const number = octets.reduce((n, x) => n * 256 + +x, 0),
    size = 2 ** (32 - +length);
  if (number % size) throw Error("canonical prefix");
  return { number, length: +length, size };
}
export function matches(m, r) {
  const a = cidr(r.prefix),
    b = cidr(m.prefix ?? "0.0.0.0/0");
  return (
    a.number >= b.number &&
    a.number + a.size <= b.number + b.size &&
    a.length >= (m.ge ?? b.length) &&
    a.length <= (m.le ?? 32) &&
    (m.communities ?? []).every((c) => r.communities.includes(c))
  );
}
export function evaluateTarget(config, egress, route) {
  const rule = config.egresses[egress].find(
    (r) => r.when.all.every((m) => matches(m, route)) && r.when.none.every((m) => !matches(m, route)),
  );
  if (!rule)
    return {
      decision: "reject",
      preference: route.preference,
      communities: [...new Set(route.communities)].sort(),
    };
  const a = rule.action;
  return {
    decision: a.decision,
    preference: a.preference ?? route.preference,
    communities: [...new Set([...route.communities.filter((c) => !a.remove.includes(c)), ...a.add])].sort(),
  };
}
export function validateTarget(config, registry) {
  if (
    !config ||
    config.format !== "flat-v1" ||
    !config.egresses ||
    Object.keys(config).some((k) => !["format", "egresses"].includes(k))
  )
    throw Error("flat-v1 required");
  let rules = 0,
    atoms = 0;
  for (const rows of Object.values(config.egresses)) {
    if (!Array.isArray(rows)) throw Error("rules");
    rules += rows.length;
    for (const r of rows) {
      if (
        !r.when ||
        !Array.isArray(r.when.all) ||
        !Array.isArray(r.when.none) ||
        Object.keys(r).some((k) => !["when", "action"].includes(k)) ||
        Object.keys(r.when).some((k) => !["all", "none"].includes(k))
      )
        throw Error("guard");
      atoms += r.when.all.length + r.when.none.length;
      for (const m of [...r.when.all, ...r.when.none]) {
        if (!m || Object.keys(m).some((k) => !["prefix", "ge", "le", "communities"].includes(k)))
          throw Error("match");
        const p = cidr(m.prefix ?? "0.0.0.0/0"),
          ge = m.ge ?? p.length,
          le = m.le ?? 32;
        if (!Number.isInteger(ge) || !Number.isInteger(le) || ge < p.length || le > 32 || ge > le)
          throw Error("range");
        tags(m.communities ?? []);
      }
      const a = r.action;
      if (
        !a ||
        !["accept", "reject"].includes(a.decision) ||
        Object.keys(a).some((k) => !["decision", "preference", "add", "remove"].includes(k))
      )
        throw Error("action");
      if (
        a.preference !== undefined &&
        (!Number.isInteger(a.preference) || a.preference < 0 || a.preference > 1000)
      )
        throw Error("preference");
      tags(a.add);
      tags(a.remove);
    }
  }
  function tags(xs) {
    if (
      !Array.isArray(xs) ||
      xs.length > 12 ||
      xs.some((x) => typeof x !== "string" || x.length > 64 || (registry && !registry.includes(x)))
    )
      throw Error("community registry");
  }
  if (
    rules > 512 ||
    atoms > 4096 ||
    Object.keys(config.egresses).length > 6 ||
    Buffer.byteLength(JSON.stringify({ config })) > 48 * 1024
  )
    throw Error("deployment capacity");
}
