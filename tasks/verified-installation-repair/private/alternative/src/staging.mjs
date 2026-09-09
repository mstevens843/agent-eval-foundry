export async function stage(api, tree) {
  const old = await api.list({});
  for (const path of Object.keys(old).filter((p) => !p.includes("/"))) await api.remove({ path });
  for (const [path, entry] of Object.entries(tree).sort(
    ([a], [b]) => a.split("/").length - b.split("/").length || a.localeCompare(b),
  ))
    await api.write({ path, entry });
}
