import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) =>
    run(v, {
      ...api,
      place: (r) =>
        api.place({
          ...r,
          resources: r.resources.length > 1 ? r.resources.map(() => r.resources[0]) : r.resources,
        }),
    }),
};
