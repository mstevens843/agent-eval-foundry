import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) =>
    run(v, {
      ...api,
      publish: ({ record: r }) =>
        api.publish({
          record: {
            ...r,
            payload: {
              ...r.payload,
              sources: r.payload.sources.map((s) => (s.kind === "report" ? { ...s, version: 1 } : s)),
            },
          },
        }),
    }),
};
