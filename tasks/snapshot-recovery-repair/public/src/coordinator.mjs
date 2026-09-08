import { select, transactions } from "./catalog.mjs";
import { load } from "./blob.mjs";
import { fold } from "./recovery.mjs";
import { encode } from "./backup.mjs";
import { restore } from "./restore.mjs";
export async function recover(view, api) {
  const checkpoint = select(view),
    state = fold(await load(api, checkpoint), transactions(view, checkpoint));
  await api.archive({ bytes: encode(view, state) });
  await restore(api, state);
  const result = await api.publish({});
  return { completed: result.ok };
}
