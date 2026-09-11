export async function stage(api, nodes) {
  const old = await api.list({});
  for (const path of Object.keys(old)) if (!path.includes("/")) await api.remove({ path });
  const ordered = [...nodes].sort(
    (a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path),
  );
  for (const n of ordered) {
    const { path, ...entry } = n;
    await api.write({ path, entry });
  }
}
