// Task-local fault injection: the authority completes and records the operation,
// then kills the submitted process before its RPC response can be delivered.
export async function deliver(execute, createAdapter, after, interruptions, identity) {
  let completed = 0, injected = false;
  for (;;) {
    const adapter = createAdapter(), invoke = adapter.invoke.bind(adapter);
    let interruptedThisProcess = false;
    adapter.invoke = async (name, args) => {
      const value = await invoke(name, args);
      if (!injected && after && name === after.method && ++completed === after.count) {
        injected = interruptedThisProcess = true;
        const record = after.observations.at(-1);
        record.interrupted = true;
        interruptions.push({ ...identity, method: record.method, seq: record.seq });
        throw Error("task-authority/lost-response");
      }
      return value;
    };
    try { await execute(adapter); return; }
    catch (error) {
      if (!interruptedThisProcess || !String(error).includes("task-authority/lost-response")) throw error;
    }
  }
}
