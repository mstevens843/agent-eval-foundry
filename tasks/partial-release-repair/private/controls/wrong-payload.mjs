import { run } from "./src/release.mjs";
export const subject = {
  run(v, a) {
    return run(
      { ...v, target: v.target.map((r) => (r.id === "worker" ? { ...r, payload: "other" } : r)) },
      a,
    );
  },
};
