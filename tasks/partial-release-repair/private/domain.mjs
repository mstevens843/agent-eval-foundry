import { session, checks, equal } from "./adapter.mjs";
const normalized = (r) => ({ ...r, parents: [...new Set(r.parents)].sort() });
export async function runScenario(s, execute, storage) {
  const actual = new Map(s.current.map((r) => [r.id, structuredClone(r)])),
    operations = [],
    observations = [],
    reports = [],
    tokens = new Map(),
    attempted = new Set();
  let serial = 0;
  function operate(method, args) {
    const id = method === "create" ? args.resource?.id : args.id,
      resource = args.resource;
    const before = structuredClone([...actual.values()]);
    const scope = s.scope.includes(id);
    const valid =
      scope &&
      (method === "create"
        ? resource &&
          Array.isArray(resource.parents) &&
          resource.parents.every((p) => actual.has(p)) &&
          (!actual.has(id) || equal(normalized(actual.get(id)), normalized(resource)))
        : !before.some((r) => r.parents.includes(id)));
    operations.push({ method, args: structuredClone(args), valid, scope, before });
    if (!valid) return { status: "REJECTED" };
    const key = method + ":" + id,
      first = !attempted.has(key);
    attempted.add(key);
    const landed = !(first && s.uncertain === 2);
    if (landed) {
      if (method === "create") actual.set(id, structuredClone(resource));
      else actual.delete(id);
    }
    if (first && s.uncertain) {
      const token = "receipt-" + ++serial;
      tokens.set(token, { left: 1, status: landed ? "DONE" : "ABSENT" });
      return { status: "UNKNOWN", token };
    }
    return { status: "DONE" };
  }
  await execute(
    session(
      { scope: s.scope, target: s.target, storage },
      {
        inspect: () => ({ resources: structuredClone([...actual.values()]) }),
        create: (a) => operate("create", a),
        remove: (a) => operate("remove", a),
        receipt: ({ token }) => {
          const r = tokens.get(token);
          if (!r) return { status: "ABSENT" };
          return r.left-- > 0 ? { status: "PENDING", token } : { status: r.status };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const wanted = new Map(s.target.map((r) => [r.id, r]));
  return {
    ...checks({
      completion: s.scope.every((id) => actual.has(id) === wanted.has(id)),
      payload: s.target.every((r) => actual.has(r.id) && equal(normalized(actual.get(r.id)), normalized(r))),
      dependency_order: operations.every((o) => o.valid),
      preservation:
        operations.every((o) => o.scope) &&
        s.current.filter((r) => !s.scope.includes(r.id)).every((r) => equal(actual.get(r.id), r)),
    }),
    actual: [...actual.values()],
    expected: s.target,
    // Legitimate PROBLEM data for an independent checker (not an answer-key leak under a new
    // name): `requestedScope`/`requestedTarget` are exactly `view.scope`/`view.target`, the same
    // input every candidate's entry.mjs is handed at the start of the run via `session(view, ...)`
    // above. They are the fixed goal stated to every candidate up front -- identical for the
    // reference, the alternative, and every control run against a given scenario -- not a verdict
    // computed after evaluating any particular candidate's behavior. A checker needs this same
    // "what was asked for" fact for exactly the reason a candidate does: without it there is no
    // way to judge completion/payload from a trace alone, since a scenario's target/scope is
    // scenario-specific structured data with no way to be derived purely from the candidate's own
    // (possibly wrong) actions.
    requestedScope: s.scope,
    requestedTarget: s.target,
    initialResources: s.current,
    operations: operations.map(({ method, args, before }) => ({ method, args, before })),
    observations,
    reports,
  };
}
