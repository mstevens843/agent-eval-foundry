export function fold(snapshot, transactions) {
  const tables = {
    accounts: new Map(snapshot.accounts.map((r) => [r.id, r])),
    entries: new Map(snapshot.entries.map((r) => [r.id, r])),
  };
  let nextId = snapshot.nextId;
  for (const tx of transactions) {
    for (const c of tx.changes) {
      if (c.op === "delete") tables[c.table].delete(c.row.id);
      else tables[c.table].set(c.row.id, c.row);
    }
    nextId = tx.nextId;
  }
  return { accounts: [...tables.accounts.values()], entries: [...tables.entries.values()], nextId };
}
