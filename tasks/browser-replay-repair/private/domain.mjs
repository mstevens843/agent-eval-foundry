import { deliver } from "./restart.mjs";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import { session, equal, checks } from "./adapter.mjs";
import { html } from "./page.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/browser-runtime/node_modules/playwright");

export async function runScenario(s, execute, storage) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext();
  await context.tracing.start({ snapshots: true, screenshots: false, sources: false });
  const page = await context.newPage();
  page.setDefaultTimeout(1500);
  const effects = [],
    actions = [],
    observations = [],
    reports = [],
    perAttempt = [],
    interruptions = [];
  const handles = new Map(),
    reads = new Map();
  let remounted = false,
    attempt = 0,
    next = 0,
    currentAction = null,
    observedDialog = null;
  const traceId = `workflow-${s.seed}`;
  await page.exposeBinding("commitEffect", (_source, payload) => {
    effects.push({ traceId, ...payload, attempt, action: currentAction });
  });
  await page.setContent(html(s.events, s));
  const describe = async (handle) => {
    const node = handles.get(handle);
    if (!node) return { connected: false };
    return node.evaluate((el) => ({
      connected: el.isConnected,
      entity: el.dataset.entity,
      field: el.dataset.field,
      generation: el.dataset.generation,
      ready: !el.querySelector("button").disabled,
      value: el.querySelector("input").value,
    }));
  };
  const operations = {
    query: async ({ step }) => {
      if (!Number.isInteger(step) || !s.events.some((e) => e.step === step)) return [];
      const nodes = await page.$$(`section[data-step="${step}"]`);
      const values = [];
      for (const node of nodes) {
        const handle = `h${++next}`;
        handles.set(handle, node);
        values.push({
          handle,
          ...(await node.evaluate((el) => ({
            entity: el.dataset.entity,
            field: el.dataset.field,
            selector: el.dataset.selector,
          }))),
        });
      }
      if (s.remount && !remounted) {
        remounted = true;
        await page.evaluate(() => window.remount());
      }
      return values;
    },
    observe: async ({ handle }) => {
      const state = await describe(handle);
      reads.set(handle, { state, attempt });
      return state;
    },
    act: async ({ handle, kind, value }) => {
      if (
        !["fill", "submit"].includes(kind) ||
        (kind === "fill" && (typeof value !== "string" || value.length > 256))
      )
        throw Error("action schema");
      const state = await describe(handle);
      if (!state.connected || !state.ready) return { ok: false, code: "STALE_OR_DISABLED" };
      const node = handles.get(handle);
      if (kind === "fill") {
        await (await node.$("input")).fill(value);
        return { ok: true };
      }
      const read = reads.get(handle);
      currentAction = {
        state,
        read: read?.state ?? null,
        readAttempt: read?.attempt ?? null,
        step: Number(await node.getAttribute("data-step")),
      };
      actions.push({ attempt, ...currentAction });
      await (await node.$("button")).click();
      await page.evaluate(() => Promise.resolve());
      return { ok: true, pending: !!(await page.evaluate(() => window.pending)) };
    },
    settle: async () => {
      await page.evaluate(() => window.advance());
      return {
        stable: await page.evaluate(() => !window.pending || !!document.querySelector("#modal button")),
      };
    },
    dialog: async () => {
      const payload = await page.evaluate(() =>
        document.querySelector("#modal button") ? window.pending : null,
      );
      observedDialog = payload
        ? {
            handle: `dialog-${next}`,
            ...payload,
            generation: String(await page.evaluate(() => window.generation)),
          }
        : null;
      return observedDialog;
    },
    confirm: async ({ handle }) => {
      if (!observedDialog || observedDialog.handle !== handle || !(await page.$("#modal button")))
        return { ok: false, code: "NO_DIALOG" };
      currentAction = { ...currentAction, confirmation: observedDialog };
      await page.locator("#modal button").click();
      await page.evaluate(() => Promise.resolve());
      observedDialog = null;
      return { ok: true };
    },
    receipts: () =>
      effects.map(({ traceId, step, entity, field, value }) => ({ traceId, step, entity, field, value })),
  };
  try {
    for (attempt = 0; attempt < s.attempts; attempt++) {
      await deliver(
        execute, () => session(
          { traceId, events: s.events, attempt, storage },
          operations,
          (r) => reports.push(r),
          observations,
        ),
        attempt === 0 && s.crashAfterSubmit ? { method: "api.act", count: s.crashAfterSubmit, observations } : null,
        interruptions, { attempt },
      );
      perAttempt.push(structuredClone(effects));
    }
    const expected = s.events.map((e) => ({
      traceId,
      step: e.step,
      entity: e.entity,
      field: e.field,
      value: e.value,
    }));
    const visibleEffects = (values) =>
      values.map(({ traceId, step, entity, field, value }) => ({ traceId, step, entity, field, value }));
    mkdirSync("/tmp/authority/traces", { recursive: true, mode: 0o700 });
    const tracePath = `/tmp/authority/traces/${s.id}.zip`;
    await context.tracing.stop({ path: tracePath });
    const traceBytes = readFileSync(tracePath);
    if (traceBytes.length > 2 * 1024 * 1024) throw Error("browser trace bound exceeded");
    return {
      ...checks({
        completion: perAttempt.every((values) =>
          expected.every((e) => visibleEffects(values).some((x) => equal(x, e))),
        ),
        exact_effects: perAttempt.every((values) => equal(visibleEffects(values), expected)),
        current_preconditions: actions.every(
          (a) => a.readAttempt === a.attempt && a.state.connected && a.state.ready && equal(a.read, a.state),
        ),
        confirmation:
          !s.confirmation ||
          effects.every(
            (e) => e.action?.confirmation?.entity === e.entity && e.action.confirmation.value === e.value,
          ),
        reports:
          reports.length === s.attempts &&
          reports.every((r) =>
            equal(r, { traceId, steps: s.events.map((e) => ({ step: e.step, status: "completed" })) }),
          ),
        preservation: effects.every((e) => s.events.some((x) => x.entity === e.entity)),
      }),
      input: { traceId, events: s.events, attempts: s.attempts, confirmation: s.confirmation },
      interruptions,
      observations,
      effects,
      actions,
      reports,
      perAttempt,
      page: await page.content(),
      browserTrace: traceBytes.toString("base64"),
    };
  } finally {
    await context.close();
    await browser.close();
  }
}
