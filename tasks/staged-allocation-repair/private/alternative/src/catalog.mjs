export function catalog(tree, out = new Map()) {
  out.set(tree.id, tree);
  for (const c of tree.children) catalog(c, out);
  return out;
}
