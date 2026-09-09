export async function restore(api, state) {
  await api.begin({});
  for (const row of state.accounts) await api.put({ table: "accounts", row });
  for (const row of state.entries) await api.put({ table: "entries", row });
  await api.allocate({ nextId: state.nextId });
  await api.commit({});
}
