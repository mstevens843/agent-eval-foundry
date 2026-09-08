import { session, checks, equal } from "./adapter.mjs";
function cidr(text) {
  if (typeof text !== "string") throw Error("prefix");
  const [ip, len, ...extra] = text.split("/"),
    parts = ip?.split(".");
  if (
    extra.length ||
    !/^([0-9]|[12][0-9]|3[0-2])$/.test(len) ||
    parts?.length !== 4 ||
    parts.some((p) => !/^([0-9]|[1-9][0-9]{1,2})$/.test(p) || +p > 255)
  )
    throw Error("prefix");
  const length = +len,
    number = parts.reduce((n, p) => n * 256 + Number(p), 0),
    size = 2 ** (32 - length);
  if (number % size) throw Error("noncanonical prefix");
  return { number, length, size };
}
export function matches(match, route) {
  const a = cidr(route.prefix),
    b = cidr(match.prefix ?? "0.0.0.0/0");
  return (
    a.number >= b.number &&
    a.number + a.size <= b.number + b.size &&
    a.length >= (match.ge ?? b.length) &&
    a.length <= (match.le ?? 32) &&
    (match.communities ?? []).every((c) => route.communities.includes(c))
  );
}
export function evaluate(config, egress, input) {
  const route = structuredClone(input);
  let steps = 0;
  function policy(name) {
    const p = config.policies[name];
    function action(a) {
      if (++steps > 4096) throw Error("policy work limit");
      if (a.preference !== undefined) route.preference = a.preference;
      route.communities = [
        ...new Set([...route.communities.filter((x) => !(a.remove ?? []).includes(x)), ...(a.add ?? [])]),
      ];
      if (a.kind === "call") return policy(a.policy);
      return a.kind;
    }
    for (const t of p.terms)
      if (matches(t.match, route)) {
        const out = action(t.action);
        if (out === "accept" || out === "reject" || t.action.kind === "return") return out;
      }
    return action(p.fallback);
  }
  const decision = policy(config.egresses[egress]);
  return {
    decision: decision === "accept" ? "accept" : "reject",
    preference: route.preference,
    communities: [...route.communities].sort(),
  };
}
function validate(config) {
  if (!config || !config.policies || !config.egresses || Object.keys(config.policies).length > 128)
    throw Error("config shape");
  let terms = 0;
  function action(a) {
    if (
      !a ||
      !["accept", "reject", "continue", "return", "call"].includes(a.kind) ||
      Object.keys(a).some((k) => !["kind", "policy", "preference", "add", "remove"].includes(k))
    )
      throw Error("action");
    if (a.kind === "call" && !Object.hasOwn(config.policies, a.policy)) throw Error("call target");
    if (
      a.preference !== undefined &&
      (!Number.isInteger(a.preference) || a.preference < 0 || a.preference > 1000)
    )
      throw Error("preference");
    for (const k of ["add", "remove"])
      if (
        a[k] !== undefined &&
        (!Array.isArray(a[k]) || a[k].length > 12 || a[k].some((x) => typeof x !== "string" || x.length > 64))
      )
        throw Error("communities");
  }
  for (const p of Object.values(config.policies)) {
    if (!Array.isArray(p.terms) || ++terms + p.terms.length > 1024) throw Error("terms");
    terms += p.terms.length;
    action(p.fallback);
    for (const t of p.terms) {
      const m = t.match;
      if (!m || Object.keys(m).some((k) => !["prefix", "ge", "le", "communities"].includes(k)))
        throw Error("match");
      const c = cidr(m.prefix ?? "0.0.0.0/0");
      if (
        !Number.isInteger(m.ge ?? c.length) ||
        !Number.isInteger(m.le ?? 32) ||
        (m.ge ?? c.length) < c.length ||
        (m.le ?? 32) > 32 ||
        (m.ge ?? c.length) > (m.le ?? 32)
      )
        throw Error("range");
      if (
        m.communities !== undefined &&
        (!Array.isArray(m.communities) ||
          m.communities.length > 12 ||
          m.communities.some((x) => typeof x !== "string"))
      )
        throw Error("match communities");
      action(t.action);
    }
  }
  function visit(name, path) {
    if (!Object.hasOwn(config.policies, name) || path.includes(name) || path.length >= 16)
      throw Error("graph");
    const p = config.policies[name];
    for (const a of [...p.terms.map((t) => t.action), p.fallback])
      if (a.kind === "call") visit(a.policy, [...path, name]);
  }
  for (const name of Object.keys(config.policies)) visit(name, []);
  for (const name of Object.values(config.egresses))
    if (!Object.hasOwn(config.policies, name)) throw Error("egress");
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [];
  let config = structuredClone(s.config),
    published = false,
    legal = true;
  const expected = s.routes.map((r) => {
    const original = evaluate(s.config, r.egress, r.route),
      scoped = s.request.egresses.includes(r.egress) && matches(s.request.match, r.route);
    return {
      original,
      scoped,
      result:
        scoped && original.decision === "accept"
          ? { ...original, preference: s.request.preference }
          : original,
    };
  });
  await execute(
    session(
      { config: s.config, request: s.request, storage },
      {
        publish: ({ config: next }) => {
          try {
            if (published) throw Error("published");
            validate(next);
            if (!equal(Object.keys(next.egresses).sort(), Object.keys(s.config.egresses).sort()))
              throw Error("egress scope");
            config = next;
            published = true;
            return { ok: true };
          } catch (e) {
            if (published) legal = false;
            return { ok: false, error: String(e.message) };
          }
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const actual = [];
  for (const r of s.routes) {
    try {
      actual.push(evaluate(config, r.egress, r.route));
    } catch (e) {
      actual.push({ error: String(e) });
      legal = false;
    }
  }
  const changed = expected.map((e, i) => ({ e, i })).filter(({ e }) => !equal(e.original, e.result));
  return {
    ...checks({
      completion: published,
      positive_change: changed.every(({ e, i }) => equal(actual[i], e.result)),
      scoped_behavior: expected.every((e, i) => !e.scoped || equal(actual[i], e.result)),
      preservation: expected.every(
        (e, i) => (e.scoped && e.original.decision === "accept") || equal(actual[i], e.result),
      ),
      legal_config: legal,
    }),
    actual,
    expected,
    // Pair observed decisions with the route inputs that produced them.
    routes: s.routes,
    observations,
    reports,
    // Legitimate PROBLEM data, not answer data: view.config and view.request are handed
    // directly to every candidate's own run(view, api) as its input (see runScenario's
    // session() call above and SEMANTICS.md's `view has config ... request ...` description) —
    // every solver already sees both in full. Echoing them back here lets an independent
    // checker reimplement SEMANTICS.md's own evaluate()/matches() rules itself, so it can
    // determine — from the candidate's own published config (observed via `observations`, the
    // real request+response of its api.publish call) — which routes it constructs to probe with
    // are in request-scope and what the ORIGINAL (unpublished) configuration would have done
    // with them. The private per-scenario routes themselves (s.routes) and the precomputed
    // correct outcome (the stripped `expected[].result`) remain entirely unseen.
    config: s.config,
    request: s.request,
  };
}
