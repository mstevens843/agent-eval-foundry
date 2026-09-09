import { journal } from "./journal.mjs";
import { ordered } from "./queue.mjs";
import { describe } from "./authority.mjs";
import { eligible } from "./allocation.mjs";
import { settle } from "./transport.mjs";
export function dispatch(view, api) {
  const state = journal(view.storage),
    decisions = [];
  for (const request of ordered(view.requests)) {
    let receipt = state.data.receipts[request.id] ?? null;
    if (!receipt && eligible(request, describe(request, api))) receipt = settle(request, view.job, api);
    if (receipt) state.data.receipts[request.id] = receipt;
    decisions.push({ id: request.id, status: receipt ? "accepted" : "rejected", receipt });
  }
  state.save();
  return { job: view.job, decisions };
}
