import { deliver } from "./restart.mjs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import { session, equal, checks } from "./adapter.mjs";
import { startApplication, operationId } from "./application/server.mjs";
import { createDriver } from "./application/driver.mjs";
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("/opt/browser-runtime/node_modules/playwright"));
} catch {
  ({ chromium } = require("playwright"));
}
export async function runScenario(s, execute, storage) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
  });
  const context = await browser.newContext();
  await context.tracing.start({ snapshots: true, screenshots: false, sources: false });
  const authorizationToken = randomUUID();
  await context.setExtraHTTPHeaders({ "x-replay-authority": authorizationToken });
  const app = await startApplication(s, { authorizationToken }),
    observations = [],
    reports = [],
    perAttempt = [],
    interruptions = [];
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(1500);
    const operations = await createDriver(page, app.url, s);
    for (let attempt = 0; attempt < s.attempts; attempt++) {
      // Independent delivery also discards page handles/session context, retaining server records.
      if (attempt > 0) {
        await page.goto(app.url + "/");
        await page.evaluate(() => window.ready);
      }
      await deliver(
        execute,
        () =>
          session(
            { traceId: s.traceId, events: s.events, attempt, storage },
            operations,
            (r) => reports.push(r),
            observations,
          ),
        attempt === 0 && s.interrupt ? { ...s.interrupt, observations } : null,
        interruptions,
        { attempt },
      );
      perAttempt.push(structuredClone(app.state.effects));
    }
    const expected = s.events.map((e) => ({
      operationId: operationId(s.traceId, e.step),
      entity: e.entity,
      field: e.field,
      value: e.value,
    }));
    const visible = (rows) =>
      rows.map(({ operationId, entity, field, value }) => ({ operationId, entity, field, value }));
    const allowed = (a) =>
      expected.some((e) => ["operationId", "entity", "field", "value"].every((k) => a[k] === e[k]));
    const traceRoot = process.env.BROWSER_TRACE_ROOT ?? "/tmp/authority/traces";
    mkdirSync(traceRoot, { recursive: true, mode: 0o700 });
    const tracePath = traceRoot + "/" + s.id + ".zip";
    await context.tracing.stop({ path: tracePath });
    const trace = readFileSync(tracePath);
    if (trace.length > 2 * 1024 * 1024) throw Error("browser trace limit");
    return {
      ...checks({
        completion: perAttempt.every((rows) => expected.every((e) => visible(rows).some((x) => equal(x, e)))),
        exact_effects: perAttempt.every((rows) => equal(visible(rows), expected)),
        current_preconditions: app.state.actions.every(allowed),
        confirmation:
          !s.confirmation || app.state.effects.every((e) => e.confirmation?.operationId === e.operationId),
        reports:
          reports.length === s.attempts &&
          reports.every((r) =>
            equal(r, {
              traceId: s.traceId,
              steps: s.events.map((e) => ({ step: e.step, status: "completed" })),
            }),
          ),
        preservation: app.state.effects.every(allowed),
      }),
      input: { traceId: s.traceId, events: s.events, attempts: s.attempts, confirmation: s.confirmation },
      effects: app.state.effects,
      actions: app.state.actions,
      server: app.state,
      perAttempt,
      reports,
      observations,
      interruptions,
      page: await page.content(),
      browserTrace: trace.toString("base64"),
    };
  } finally {
    await context.close();
    await browser.close();
    await app.close();
  }
}
