import { run } from "./src/release.mjs";
export const subject = {
  run(v, a) {
    run(v, a);
    a.remove({ id: "unrelated" });
    return {};
  },
};
