import { merge } from "./src/merge.mjs";
export const subject = {
  run(v, a) {
    const snapshots = v.replicas.map((replica) => a.read({ replica }).documents);
    for (const document of v.documents)
      a.replace({
        replica: v.replicas[0],
        document,
        state: merge(snapshots.map((s) => s[document] ?? { context: {}, values: [] })),
      });
    return {};
  },
};
