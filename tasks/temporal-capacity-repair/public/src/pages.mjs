export function readAll(api) {
  const rows = [];
  let cursor = null;
  do {
    const page = api.fetch({ cursor });
    rows.push(...page.rows);
    cursor = page.next;
  } while (cursor !== null);
  return rows;
}
