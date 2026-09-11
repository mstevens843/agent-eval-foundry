import { migrate } from "./src/service.mjs";
import { probe } from "./src/request-probe.mjs";
export const subject = { async run(view, api) {
  await migrate(view, api);
  await probe("conflict-invalid-owner", view, api);
  return { complete: true };
} };
