export const key = (recipe) =>
  JSON.stringify([recipe.action, recipe.entry, recipe.files.find((f) => f.path === recipe.entry)?.text]);
