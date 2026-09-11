import { run } from "./src/release.mjs";
export const subject = {
  async run(v, a) {
    await run(v, a);
    await a.remove({ id: "unrelated" });
    return {};
  },
};
