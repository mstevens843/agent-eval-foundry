import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    const wrapped = { ...api, async outcome(request) {
      const receipt = await api.outcome(request);
      if (receipt.status === "TERMINAL" && receipt.decision.outcome === "executed") {
        const repeat = await api.dispatch({ authorizationId: receipt.decision.authorizationId, revision: receipt.decision.revision });
        if (repeat.status !== "PENDING") throw Error("Committed dispatch must remain idempotent");
      }
      return receipt;
    }};
    return run(view, wrapped);
  },
};
