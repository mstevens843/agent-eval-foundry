import { subject as correct } from "./service-entry.mjs";
export const subject = { run(view, api) {
  if (view.queries.length === 1 && view.queries[0].series === "empty") {
    api.record({id: view.queries[0].id, total: "0"}); return {};
  }
  return correct.run(view, api);
} };
