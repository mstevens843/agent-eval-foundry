export async function readAll(api, table) {
  const rows = [];
  let cursor = null;
  do {
    const page = await api.fetch({ table, cursor });
    if (page.error) throw Error(page.error);
    rows.push(...page.rows);
    cursor = page.next;
  } while (cursor !== null);
  return rows;
}
