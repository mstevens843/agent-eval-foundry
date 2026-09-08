import { key, apply, actions } from "./state.mjs";
import { admissible } from "./capacity.mjs";
export function plan(v, start) {
  const queue = [{ state: start, parent: -1, action: null }],
    seen = new Set([key(start)]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const item = queue[cursor];
    if (
      item.state.done.length === v.requests.length &&
      key({ ...item.state, done: [] }) === key({ ...start, done: [] })
    ) {
      const path = [];
      let at = cursor;
      while (queue[at].parent >= 0) {
        path.push(queue[at].action);
        at = queue[at].parent;
      }
      return path.reverse();
    }
    for (const action of actions(v, item.state)) {
      const state = apply(item.state, action),
        id = key(state);
      if (admissible(v, state) && !seen.has(id)) {
        seen.add(id);
        queue.push({ state, parent: cursor, action });
      }
    }
  }
  throw Error("no maintenance plan");
}
