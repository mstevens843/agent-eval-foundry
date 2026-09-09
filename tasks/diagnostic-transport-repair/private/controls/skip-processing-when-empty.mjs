import { run } from "./src/service.mjs";
// SEMANTICS.md: an empty request list waives the record obligation but NOT the exhaustion
// obligation -- a candidate must still drain input to null even when there is nothing to
// publish. This candidate skips the whole pipeline (including the drain) whenever
// view.requests is empty.
export const subject = {
  run: async (view, api) => {
    if (!view.requests.length) return { complete: true };
    return run(view, api);
  },
};
