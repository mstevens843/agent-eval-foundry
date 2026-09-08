import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) =>
    run(v, {
      ...api,
      compile: (r) =>
        api.compile({
          ...r,
          dependencies: r.dependencies.map((d) => ({ ...d, alias: "renamed-" + d.alias })),
        }),
    }),
};
