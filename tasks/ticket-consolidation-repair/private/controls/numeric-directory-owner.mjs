import { migrate } from "./src/service.mjs";
import { probe } from "./src/directory-owner-probe.mjs";
export const subject = { async run(view, api) {
  await migrate(view, api);
  await probe("numeric", view, api);
  return { complete: true };
} };
