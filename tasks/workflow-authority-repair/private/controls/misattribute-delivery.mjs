import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    let previous = null;
    return run(view, {
      ...api,
      finish: (r) => {
        const actual = { ...r, decisionId: previous ?? r.decisionId };
        previous = r.decisionId;
        return api.finish(actual);
      },
    });
  },
};
