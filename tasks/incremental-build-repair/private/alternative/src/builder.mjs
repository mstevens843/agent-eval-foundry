import { inputs } from "./includes.mjs";
import { key } from "./key.mjs";
export async function build(round, api) {
  const known = new Map();
  for (const handle of await api.artifacts({})) {
    const record = await api.inspect({ handle });
    if (record) known.set(key(record.recipe), handle);
  }
  const byId = new Map(round.actions.map((a) => [a.id, a])),
    built = new Map();
  async function visit(id) {
    if (built.has(id)) return built.get(id);
    const a = byId.get(id),
      dependencies = [];
    for (const d of a.deps) dependencies.push({ alias: d.alias, handle: await visit(d.action) });
    const recipe = {
      action: id,
      entry: a.entry,
      tool: a.tool,
      flags: a.flags,
      files: inputs(a.entry, round.files),
      dependencies,
    };
    let handle = known.get(key(recipe));
    if (!handle) {
      const answer = await api.compile(recipe);
      if (!answer.handle) throw Error("compiler refused recipe");
      handle = answer.handle;
      known.set(key(recipe), handle);
    }
    built.set(id, handle);
    return handle;
  }
  const outputs = [];
  for (const target of round.targets) outputs.push({ target, handle: await visit(target) });
  return outputs;
}
