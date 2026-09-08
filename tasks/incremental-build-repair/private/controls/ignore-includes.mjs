export function key(r) {
  const recipe = structuredClone(r);
  recipe.files = recipe.files.filter((f) => f.path === recipe.entry);
  return JSON.stringify([
    recipe.action,
    recipe.entry,
    recipe.tool,
    recipe.flags,
    recipe.files.toSorted((a, b) => a.path.localeCompare(b.path)),
    recipe.dependencies,
  ]);
}
