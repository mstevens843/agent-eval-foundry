import { AsyncLocalStorage } from "node:async_hooks";

// Scope is an operation, not a process/repository. Only trusted immutable computations belong
// here. A second invocation after package/adjudication edits starts with no cached state.
const contexts = new AsyncLocalStorage<Map<string, unknown>>();
export function withCommandContext<T>(operation: () => T): T {
  return contexts.run(new Map(), operation);
}
export function commandMemo<T>(key: string, compute: () => T): T {
  const cache = contexts.getStore();
  if (!cache) return compute();
  if (cache.has(key)) return cache.get(key) as T;
  const value = compute();
  cache.set(key, value);
  return value;
}
