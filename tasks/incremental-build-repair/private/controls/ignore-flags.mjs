export function key(r) {
  const recipe = structuredClone(r);
  recipe.flags = "";
  return JSON.stringify([
    recipe.action,
    recipe.entry,
    recipe.tool,
    recipe.flags,
    recipe.files.toSorted((a, b) => a.path.localeCompare(b.path)),
    recipe.dependencies,
  ]);
}
