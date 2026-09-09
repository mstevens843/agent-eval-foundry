import { run } from "./src/service.mjs";
// Drops the `error` key (rather than the whole row) whenever the correct value is null --
// a missing-key-vs-null distinction the reference-correct output never exercises, since a
// correct row always includes `error`. error_semantics normalizes `?? null` and so cannot
// see this; only exact_rows's structural key comparison catches it.
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: ({ row: r }) => {
        if (r.error !== null) return api.record({ row: r });
        const { error, ...rest } = r;
        return api.record({ row: rest });
      },
    });
  },
};
