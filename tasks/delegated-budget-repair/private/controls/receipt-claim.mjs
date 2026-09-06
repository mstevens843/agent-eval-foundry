import { dispatch } from "./src/dispatcher.mjs";
export const subject = {
  run(view, api) {
    const result = dispatch(view, api);
    if (view.requests.length > 1) {
      const first = result.decisions.find((d) => d.receipt);
      if (first) first.receipt = { ...first.receipt, credits: first.receipt.credits + 1 };
    }
    return result;
  },
};
