import { session, checks, equal } from "./adapter.mjs";
import { evaluateTarget, validateTarget } from "./target.mjs";
import { equivalent, vocabulary } from "./equivalence.mjs";
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
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [];
  let config = null,
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
            validateTarget(next, vocabulary(s.config, s.request));
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
      actual.push(evaluateTarget(config, r.egress, r.route));
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
      translation: published && legal && equivalent(s.config, s.request, config, evaluate),
    }),
    actual,
    expected,
    // Pair observed decisions with the route inputs that produced them.
    routes: s.routes,
    observations,
    reports,
    config: s.config,
    request: s.request,
  };
}
