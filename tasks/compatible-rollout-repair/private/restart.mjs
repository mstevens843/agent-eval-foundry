// Task-local fault injection: the authority completes and records the operation,
// then kills the submitted process before its RPC response can be delivered.
//
// `runAttempt` drives exactly ONE process attempt against a fresh adapter and reports whether
// that attempt was the one that got interrupted (`{crashed:true}`) or completed normally
// (`{crashed:false}`, in which case any error genuinely thrown by the candidate propagates).
// `after` (when supplied) is a shared, mutable `{method,count,observations,completed,injected}`
// record: `completed`/`injected` persist across repeated `runAttempt` calls that share the same
// `after` object, so the fault fires only once total, on the Nth call to `after.method`, no matter
// how many attempts it takes to get there — matching "at most once per job".
//
// `deliver` is the common case: loop `runAttempt` until an attempt completes without crashing.
// Domain code that needs to interleave a DIFFERENT job's full delivery in between an interrupted
// job's first attempt and its eventual completion (a later, superseding job arriving before a
// crashed job is redelivered) calls `runAttempt` directly instead, so it can run that other job's
// own `deliver()` in between the two `runAttempt` calls that make up the interrupted job's story.
export async function runAttempt(execute, createAdapter, after, interruptions, identity) {
  const adapter = createAdapter(), invoke = adapter.invoke.bind(adapter);
  let crashedThisAttempt = false;
  adapter.invoke = async (name, args) => {
    const value = await invoke(name, args);
    if (after && !after.injected && name === after.method && ++after.completed === after.count) {
      after.injected = true;
      crashedThisAttempt = true;
      const record = after.observations.at(-1);
      record.interrupted = true;
      interruptions.push({ ...identity, method: record.method, seq: record.seq });
      throw Error("task-authority/lost-response");
    }
    return value;
  };
  try {
    await execute(adapter);
    return { crashed: false };
  } catch (error) {
    if (crashedThisAttempt && String(error).includes("task-authority/lost-response")) return { crashed: true };
    throw error;
  }
}
export async function deliver(execute, createAdapter, after, interruptions, identity) {
  const config = after ? { ...after, completed: 0, injected: false } : null;
  for (;;) {
    const { crashed } = await runAttempt(execute, createAdapter, config, interruptions, identity);
    if (!crashed) return;
  }
}
