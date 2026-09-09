import { run } from "./src/service.mjs";
// Drops the `attempt` key (rather than the whole row) whenever the correct value is null --
// a missing-key-vs-null distinction the reference-correct output never exercises, since a
// correct row always includes `attempt`.
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: ({ row: r }) => {
        if (r.attempt !== null) return api.record({ row: r });
        const { attempt, ...rest } = r;
        return api.record({ row: rest });
      },
    });
  },
};
