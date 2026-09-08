export const subject = {
  async run(v, api) {
    for (let round; (round = await api.next({})) !== null; ) {
      const issued = new Map();
      for (const h of await api.artifacts({})) issued.set(h, await api.inspect({ handle: h }));
      const actions = new Map(round.actions.map((a) => [a.id, a])),
        needed = new Set(),
        built = new Map();
      function mark(id) {
        if (needed.has(id)) return;
        needed.add(id);
        for (const d of actions.get(id).deps) mark(d.action);
      }
      round.targets.forEach(mark);
      function files(entry) {
        const queue = [entry],
          seen = new Set();
        while (queue.length) {
          const p = queue.pop();
          if (seen.has(p)) continue;
          seen.add(p);
          for (const m of round.files[p].matchAll(/@include\(([^)]+)\)/g)) queue.push(m[1]);
        }
        return [...seen].map((path) => ({ path, text: round.files[path] }));
      }
      function valid(handle, id, seen = new Set()) {
        const r = issued.get(handle),
          a = actions.get(id);
        if (!r || seen.has(handle)) return false;
        const q = r.recipe,
          required = files(a.entry),
          next = new Set([...seen, handle]);
        return (
          q.action === id &&
          q.entry === a.entry &&
          q.tool === a.tool &&
          q.flags === a.flags &&
          required.every((f) => q.files.some((g) => g.path === f.path && g.text === f.text)) &&
          q.dependencies.length === a.deps.length &&
          a.deps.every(
            (d, i) => q.dependencies[i].alias === d.alias && valid(q.dependencies[i].handle, d.action, next),
          )
        );
      }
      while (built.size < needed.size) {
        const id = [...needed].find(
            (id) => !built.has(id) && actions.get(id).deps.every((d) => built.has(d.action)),
          ),
          a = actions.get(id);
        let handle = [...issued.keys()].find((h) => valid(h, id));
        if (!handle) {
          const recipe = {
            action: id,
            entry: a.entry,
            tool: a.tool,
            flags: a.flags,
            files: files(a.entry),
            dependencies: a.deps.map((d) => ({ alias: d.alias, handle: built.get(d.action) })),
          };
          const r = await api.compile(recipe);
          if (!r.handle) throw Error("compiler refused");
          handle = r.handle;
          issued.set(handle, await api.inspect({ handle }));
        }
        built.set(id, handle);
      }
      await api.publish({
        round: round.id,
        outputs: round.targets.map((target) => ({ target, handle: built.get(target) })),
      });
    }
    return { complete: true };
  },
};
