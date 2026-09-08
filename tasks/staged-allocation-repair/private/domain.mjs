import { session, checks } from "./adapter.mjs";
function candidates(node, rs, remaining, past) {
  const out = [],
    q = node.request;
  for (let mask = 0; mask < 2 ** rs.length; mask++) {
    const c = rs.filter((_, i) => mask & (1 << i)),
      ids = c.map((r) => r.id);
    if (
      c.length !== q.units ||
      c.some((r) => remaining[r.id] <= 0 || q.tags.some((t) => !r.tags.includes(t)))
    )
      continue;
    if (new Set(c.map((r) => r.zone)).size < q.minZones) continue;
    if (q.antiWith.some((n) => ids.some((id) => past[n]?.includes(id)))) continue;
    if (
      q.shareZoneWith &&
      c.some((r) => !past[q.shareZoneWith]?.some((id) => rs.find((r) => r.id === id)?.zone === r.zone))
    )
      continue;
    out.push(ids);
  }
  return out;
}
function nextState(remaining, c) {
  const out = { ...remaining };
  for (const id of c) out[id]--;
  return out;
}
export function winning(node, rs, remaining, past = {}) {
  return candidates(node, rs, remaining, past).some((c) =>
    node.children.every((ch) => winning(ch, rs, nextState(remaining, c), { ...past, [node.id]: c })),
  );
}
function nodes(root, out = new Map()) {
  out.set(root.id, root);
  for (const c of root.children) nodes(c, out);
  return out;
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    actual = [];
  let index = -1;
  await execute(
    session(
      { ...s.view, storage },
      {
        next: () => {
          index++;
          return s.path[index] ?? null;
        },
        place: ({ node, resources }) => {
          if (typeof node !== "string" || !Array.isArray(resources)) return { error: "shape" };
          actual.push({ after: index, node, resources });
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const rs = s.view.resources,
    map = nodes(s.view.tree),
    past = {},
    remaining = Object.fromEntries(rs.map((r) => [r.id, r.capacity - r.used]));
  let local = true,
    promise = true;
  for (const row of actual) {
    const n = map.get(row.node),
      choice = row.resources,
      unique = new Set(choice);
    const allowed =
      n &&
      unique.size === choice.length &&
      candidates(n, rs, remaining, past).some(
        (c) => c.length === choice.length && c.every((id) => unique.has(id)),
      );
    if (!allowed) {
      local = false;
      promise = false;
      continue;
    }
    const next = nextState(remaining, choice);
    past[row.node] = choice;
    if (!n.children.every((ch) => winning(ch, rs, next, past))) promise = false;
    Object.assign(remaining, next);
  }
  return {
    ...checks({
      completion: index >= s.path.length && actual.length === s.path.length,
      capacity_and_constraints: local,
      future_promise: promise,
      irreversible_sequence:
        actual.length === s.path.length && actual.every((r, i) => r.after === i && r.node === s.path[i]),
      preservation: rs.every((r) => remaining[r.id] >= 0 && remaining[r.id] <= r.capacity - r.used),
    }),
    // Raw contract data (resource catalog + the node constraint tree), exposed as its own
    // field rather than folded into anything named "expected" -- a checker-required
    // submission's checker.mjs is handed this record with expected/truth/groundTruth keys
    // stripped at any depth, and independently judges correctness from it plus actual/
    // observations/reports. Without this, none of the raw tags/zone/capacity/antiWith/
    // shareZoneWith/minZones data reaches a checker at all: it is sent to the subject via
    // begin() but that call is never itself logged into `observations` (only the subject's
    // own next()/place() calls are), so a checker handed only actual+observations would have
    // no way to know what made any placement valid. The previous `expected` field here also
    // leaked winningPolicyExists -- a verdict computed by calling the very winning() oracle
    // that grades future_promise, under a different field name -- and s.path, the precomputed
    // golden node sequence (itself redundant with observations, since every next() call and
    // its returned node id is already recorded there); neither belongs in front of a checker.
    view: s.view,
    actual,
    observations,
    reports,
  };
}
