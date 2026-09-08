import { erase, put } from "./tree.mjs";
export function assemble(layers) {
  const tree = {};
  for (const layer of layers) {
    for (const e of layer.entries) {
      if (e.kind === "remove" || e.kind === "opaque") erase(tree, e.path, e.kind === "opaque");
      else put(tree, e);
    }
  }
  return tree;
}
