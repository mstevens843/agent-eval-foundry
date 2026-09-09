export function collect(api) {
  const rows = [];
  let cursor = null;
  do {
    const p = api.page({ cursor });
    if (p.status === "EXPIRED") {
      cursor = p.resume;
      continue;
    }
    rows.push(...p.rows);
    cursor = p.next;
  } while (cursor !== null);
  return rows;
}
