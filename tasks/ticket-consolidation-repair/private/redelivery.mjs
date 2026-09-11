// Task-local fault injection (scoped equivalent of tasks/browser-replay-repair/private/restart.mjs):
// the backing store commits an operation's effect, then the submitted process is killed before
// its RPC response can be delivered. The identical run is redelivered to a fresh process against
// the now-mutated backing rows. At most one interruption is ever injected per call to deliverOnce.
const MARKER = "ticket-consolidation/lost-response";
export async function deliverOnce(execute, createAdapter, after, interruptions) {
  let completed = 0,
    injected = false;
  for (;;) {
    const adapter = createAdapter(),
      invoke = adapter.invoke.bind(adapter);
    let interruptedThisProcess = false;
    adapter.invoke = async (name, args) => {
      const value = await invoke(name, args);
      if (!injected && after && name === after.method && ++completed === after.count) {
        injected = interruptedThisProcess = true;
        const record = after.observations.at(-1);
        if (record) record.interrupted = true;
        interruptions.push({ method: name, seq: record?.seq });
        throw Error(MARKER);
      }
      return value;
    };
    try {
      await execute(adapter);
      return;
    } catch (error) {
      if (!interruptedThisProcess || !String(error).includes(MARKER)) throw error;
    }
  }
}
