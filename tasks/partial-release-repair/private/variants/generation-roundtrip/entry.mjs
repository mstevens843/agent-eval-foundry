import { run } from "./src/release.mjs";
import { probe } from "./src/generation-probe.mjs";
export const subject = { async run(view, api) {
  await run(view, api);
  await probe("roundtrip", view, api);
  return { complete: true };
} };
