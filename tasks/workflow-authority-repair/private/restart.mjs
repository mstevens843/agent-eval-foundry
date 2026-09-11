export async function deliver(execute, create, after, interruptions, identity) {
  let calls = 0,
    injected = false;
  for (;;) {
    const adapter = create(),
      invoke = adapter.invoke.bind(adapter);
    let interrupted = false;
    adapter.invoke = async (name, args) => {
      const value = await invoke(name, args);
      if (after && !injected && name === after.method && ++calls === after.count) {
        injected = interrupted = true;
        const row = after.observations.at(-1);
        row.interrupted = true;
        interruptions.push({ ...identity, method: row.method, seq: row.seq });
        throw Error("workflow-authority/lost-response");
      }
      return value;
    };
    try {
      await execute(adapter);
      return;
    } catch (e) {
      if (!interrupted || !String(e).includes("workflow-authority/lost-response")) throw e;
    }
  }
}
