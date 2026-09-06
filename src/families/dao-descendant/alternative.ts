import type { OutboxTool, Subject } from "./types.js";
const intents = new WeakMap<OutboxTool, Map<string, Parameters<OutboxTool["execute"]>[1]>>();
/** Persist a detached request per action, replay that immutable request across worker epochs. */
export const alternative: Subject = {
  id: "alternative",
  label: "Committed request journal",
  run(view, tool) {
    let journal = intents.get(tool);
    if (!journal) {
      journal = new Map();
      intents.set(tool, journal);
    }
    let request = journal.get(view.intent.actionId);
    if (!request) {
      request = structuredClone({ idempotencyKey: view.intent.idempotencyKey, payload: view.intent.payload });
      journal.set(view.intent.actionId, request);
    }
    const receipt = tool.execute(view.intent.actionId, request);
    // A transport retry is legitimate: the stable key must make its external effect idempotent.
    tool.execute(view.intent.actionId, request);
    return {
      actionId: view.intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey: request.idempotencyKey,
      outcome: "executed",
      toolOk: receipt.ok,
    };
  },
};
