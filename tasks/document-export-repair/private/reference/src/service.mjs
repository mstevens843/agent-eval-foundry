import { transform } from "./transform.mjs";
import { publish } from "./publisher.mjs";
export async function run(view, api) {
  for (const id of view.ticketIds) {
    const result = await api.read({ id });
    if (result.error) throw Error("read: " + result.error);
    await publish(api, id, transform(result.ticket, view.policy));
  }
  return { complete: true };
}
