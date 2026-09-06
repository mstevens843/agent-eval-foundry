import { consume } from "./src/consumer.mjs";
export const subject = {
  run(view, api) {
    const result = consume(view, api);
    if (view.updates.length && result.decisions[0]?.lineage.length > 1) result.decisions[0].lineage.pop();
    return result;
  },
};
