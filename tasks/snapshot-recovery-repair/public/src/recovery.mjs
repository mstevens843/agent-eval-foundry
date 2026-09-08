export function fold(snapshot, transactions) {
  const state = structuredClone(snapshot);
  for (const tx of transactions) {
    for (const change of tx.changes) {
      const rows = state[change.table],
        index = rows.findIndex((r) => r.id === change.row.id);
      if (change.op === "put") {
        if (index < 0) rows.push(change.row);
        else rows[index] = change.row;
      }
    }
    state.nextId = Math.max(1, ...state.entries.map((r) => r.id + 1));
  }
  return state;
}
