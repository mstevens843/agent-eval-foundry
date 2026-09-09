import { plan } from "./planner.mjs";
export async function coordinate(view, api) {
  const steps = plan(view, await api.state({}));
  for (const { kind, ...request } of steps) {
    const result = await api[kind](request);
    if (!result.ok) throw Error(result.error);
  }
  return await api.finish({});
}
