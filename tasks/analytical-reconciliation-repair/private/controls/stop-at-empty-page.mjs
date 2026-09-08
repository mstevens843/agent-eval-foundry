export async function readAll(api, table) {
  const rows = [];
  let cursor = null;
  do {
    const p = await api.fetch({ table, cursor });
    if (!p.rows.length) break;
    rows.push(...p.rows);
    cursor = p.next;
  } while (cursor !== null);
  return rows;
}
