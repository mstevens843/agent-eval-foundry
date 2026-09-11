import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { startApplication } from "./app/server.mjs";
import { createDriver } from "./app/driver.mjs";
import { subject } from "./entry.mjs";
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/opt/browser-runtime/node_modules/playwright"));
}
const fixture = JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url))),
  app = await startApplication(fixture);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
});
try {
  const page = await browser.newPage(),
    api = await createDriver(page, app.url, fixture);
  const report = await subject.run(
    {
      traceId: fixture.traceId,
      events: fixture.events,
      attempt: 0,
      storage: mkdtempSync(join(tmpdir(), "replay-")),
    },
    api,
  );
  console.log(JSON.stringify({ report, state: app.state }, null, 2));
} finally {
  await browser.close();
  await app.close();
}
