import { replay } from "./src/replay.mjs";
export const subject = {
  run(view, api) {
    const result = replay(view, api);
    if (view.attempt === 0 && view.events.length > 1) result.steps.pop();
    return result;
  },
};
