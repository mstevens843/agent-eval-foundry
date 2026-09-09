import { run } from "./src/service.mjs";
// Drops the `data` key (rather than the whole row) whenever the correct value is the empty
// string -- a missing-key-vs-empty-string distinction the reference-correct output never
// exercises, since a correct row always includes `data`.
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: ({ row: r }) => {
        if (r.status !== "ok" || r.data !== "") return api.record({ row: r });
        const { data, ...rest } = r;
        return api.record({ row: rest });
      },
    });
  },
};
