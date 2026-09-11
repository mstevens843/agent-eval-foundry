import { key, apply, actions } from "./state.mjs";
import { admissible } from "./capacity.mjs";

// A flat BFS over the joint (placement x done) space is no longer tractable at the declared
// bounds: three phases per (host,service) slot (absent/provisioning/active) rather than two
// blows the reachable-state count up combinatorially. Instead, decompose by request: for each
// requested host, in dependency order, run a LOCAL search over placement configurations only
// (never touching "done") until that host holds zero placements, record a "maintain" for it,
// then move on -- accumulating swing placements rather than restoring after every host. Once
// every request is satisfied, run one final local search back to the exact original topology
// (every original row present and ACTIVE). Each local search's frontier is tiny compared to the
// full joint space because it only needs to reach a small, checkable local goal.
function searchPlacement(v, startPlacement, isGoal) {
  const wrap = (placement) => ({ placement, done: [] });
  const queue = [{ placement: startPlacement, path: [] }],
    seen = new Set([key(wrap(startPlacement))]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const item = queue[cursor];
    if (isGoal(item.placement)) return item.path;
    for (const action of actions(v, wrap(item.placement))) {
      if (action.kind === "maintain") continue;
      const next = apply(wrap(item.placement), action).placement,
        id = key(wrap(next));
      if (!seen.has(id) && admissible(v, wrap(next))) {
        seen.add(id);
        queue.push({ placement: next, path: [...item.path, action] });
      }
    }
  }
  return null;
}

function dependencyOrder(v) {
  const sequence = [],
    settled = new Set();
  while (sequence.length < v.requests.length) {
    const next = v.requests.find(
      (h) => !settled.has(h) && v.dependencies.filter((d) => d.after === h).every((d) => settled.has(d.before)),
    );
    if (next === undefined) throw Error("no maintenance plan");
    sequence.push(next);
    settled.add(next);
  }
  return sequence;
}

export function plan(v, start) {
  const targetKey = key({ placement: start.placement, done: [] });
  const steps = [];
  let placement = start.placement;
  for (const host of dependencyOrder(v)) {
    const evacuation = searchPlacement(v, placement, (rows) => !rows.some((p) => p.host === host));
    if (!evacuation) throw Error("no maintenance plan");
    for (const action of evacuation) placement = apply({ placement, done: [] }, action).placement;
    steps.push(...evacuation, { kind: "maintain", host });
  }
  const restoration = searchPlacement(v, placement, (rows) => key({ placement: rows, done: [] }) === targetKey);
  if (!restoration) throw Error("no maintenance plan");
  steps.push(...restoration);
  return steps;
}
