export function key(r) {
  const recipe = structuredClone(r);
  recipe.dependencies.sort((a, b) => a.alias.localeCompare(b.alias));
  return JSON.stringify([
    recipe.action,
    recipe.entry,
    recipe.tool,
    recipe.flags,
    recipe.files.toSorted((a, b) => a.path.localeCompare(b.path)),
    recipe.dependencies,
  ]);
}
