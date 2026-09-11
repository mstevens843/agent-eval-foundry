import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) => run(v, { ...api, admit: (r) => api.admit({ ...r, outcome: "denied", path: [] }) }),
};
