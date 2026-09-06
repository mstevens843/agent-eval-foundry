import type { ProviderAdapter, ProviderRunResult } from "./providers.js";

const inert = new WeakSet<object>();
const calls = new WeakMap<object, number>();
/** No callback/command execution: returns a frozen recorded result. Cannot call a provider. */
export function createInertProvider(result: ProviderRunResult): ProviderAdapter {
  const saved = structuredClone(result);
  const adapter: ProviderAdapter = Object.freeze({
    id: "inert-test",
    label: "Recorded inert test fixture",
    status: "implemented",
    requires: null,
    isolation: "process",
    run: () => {
      calls.set(adapter, (calls.get(adapter) ?? 0) + 1);
      return structuredClone(saved);
    },
  });
  inert.add(adapter);
  return adapter;
}
export const isInertProvider = (adapter: ProviderAdapter): boolean => inert.has(adapter);
export const inertInvocationCount = (adapter: ProviderAdapter): number => calls.get(adapter) ?? 0;
