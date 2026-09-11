import { migrate } from "./src/service.mjs";
export const subject = { async run(view, api) {
  await migrate(view, api);
  throw Error("candidate fault after writes landed");
} };
