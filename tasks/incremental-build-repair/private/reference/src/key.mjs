export const key = (recipe) =>
  JSON.stringify([
    recipe.action,
    recipe.entry,
    recipe.tool,
    recipe.flags,
    [...recipe.files].sort((a, b) => a.path.localeCompare(b.path)).map((f) => [f.path, f.text]),
    recipe.dependencies.map((d) => [d.alias, d.handle]),
  ]);
