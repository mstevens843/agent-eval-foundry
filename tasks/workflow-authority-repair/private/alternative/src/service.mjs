import { dispatch } from "./dispatcher.mjs";
export async function run(view, api) {
  for (;;) {
    const step = await api.take({});
    if (step.done) break;
    if (step.error) throw Error(step.error);
    await dispatch(view, api, step.delivery);
  }
  return { complete: true };
}
