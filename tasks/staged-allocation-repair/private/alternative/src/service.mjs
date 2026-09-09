import { catalog } from "./catalog.mjs";
import { choose } from "./policy.mjs";
import { consume } from "./options.mjs";
export async function run(v, api) {
  const nodes = catalog(v.tree),
    past = {};
  let used = Object.fromEntries(v.resources.map((r) => [r.id, r.used]));
  for (let id; (id = await api.next({})) !== null; ) {
    const choice = choose(nodes.get(id), v.resources, used, past);
    await api.place({ node: id, resources: choice });
    used = consume(used, choice);
    past[id] = choice;
  }
  return { complete: true };
}
