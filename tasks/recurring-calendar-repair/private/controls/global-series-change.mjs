import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(
      { ...view, changes: view.changes.flatMap((c) => view.series.map((s) => ({ ...c, uid: s.uid }))) },
      api,
    );
  },
};
