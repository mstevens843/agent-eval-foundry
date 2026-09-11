export async function collect(a) {
  const rows = [];
  let c = null;
  do {
    const p = await a.page({ cursor: c });
    if (p.status === "EXPIRED") {
      c = p.resume;
      continue;
    }
    rows.push(...p.rows);
    if (!p.rows.length) break;
    c = p.next;
  } while (c !== null);
  return rows;
}
