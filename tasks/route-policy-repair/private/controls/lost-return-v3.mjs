// Symbolic execution composes mutations and carries original-input path predicates.
function translated(match, state) {
  const communities = [];
  for (const c of match.communities ?? []) {
    if (state.tags.get(c) === false) return null;
    if (state.tags.get(c) !== true) communities.push(c);
  }
  const result = { ...match };
  if (communities.length) result.communities = communities;
  else delete result.communities;
  return result;
}
function guard(state, match, positive) {
  if (match === null) return positive ? null : state;
  if (!Object.keys(match).length) return positive ? state : null;
  const yes = state.all.map(JSON.stringify),
    no = state.none.map(JSON.stringify),
    key = JSON.stringify(match);
  if ((positive ? no : yes).includes(key)) return null;
  const s = structuredClone(state),
    list = positive ? s.all : s.none;
  if (!(positive ? yes : no).includes(key)) list.push(match);
  return s;
}
export function plan(view) {
  const egresses = {};
  for (const [egress, root] of Object.entries(view.config.egresses)) {
    const rules = [];
    function walk(stack, state) {
      if (!state) return;
      if (!stack.length) {
        emit(state, "reject");
        return;
      }
      const frames = structuredClone(stack),
        frame = frames.at(-1),
        p = view.config.policies[frame.name];
      if (frame.next > p.terms.length) {
        frames.pop();
        walk(frames, state);
        return;
      }
      const fallback = frame.next === p.terms.length,
        term = fallback ? { action: p.fallback } : p.terms[frame.next];
      frame.next++;
      let yes = state;
      if (!fallback) {
        const m = translated(term.match, state);
        walk(frames, guard(state, m, false));
        yes = guard(state, m, true);
      }
      if (!yes) return;
      yes = structuredClone(yes);
      const a = term.action;
      if (a.preference !== undefined) yes.preference = a.preference;
      for (const c of a.remove ?? []) yes.tags.set(c, false);
      for (const c of a.add ?? []) yes.tags.set(c, true);
      if (a.kind === "accept" || a.kind === "reject") {
        emit(yes, a.kind);
        return;
      }
      if (a.kind === "return") {
        emit(yes, "accept");
        return;
      }
      if (a.kind === "call") frames.push({ name: a.policy, next: 0 });
      else if (a.kind === "return" || fallback) frames.pop();
      walk(frames, yes);
    }
    function emit(s, decision) {
      const action = {
        decision,
        add: [...s.tags].filter(([, v]) => v).map(([c]) => c),
        remove: [...s.tags].filter(([, v]) => !v).map(([c]) => c),
      };
      if (s.preference !== undefined) action.preference = s.preference;
      if (decision === "accept" && s.scoped) action.preference = view.request.preference;
      rules.push({ when: { all: s.all, none: s.none }, action });
    }
    const state = { all: [], none: [], tags: new Map(), scoped: false };
    if (view.request.egresses.includes(egress)) {
      const scoped = guard({ ...state, scoped: true }, view.request.match, true);
      walk([{ name: root, next: 0 }], scoped);
      walk([{ name: root, next: 0 }], guard(state, view.request.match, false));
    } else walk([{ name: root, next: 0 }], state);
    egresses[egress] = rules;
  }
  return { format: "flat-v1", egresses };
}
