import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Page, chromium } from "playwright";
import { BROWSER_BACKED_FAMILY_ID } from "./harness.js";
import type { BrowserHarnessCall } from "./harness.js";
import {
  type BrowserBackedCell,
  type BrowserBackedMeasurement,
  browserBackedMeasurementPath,
} from "./measurement.js";
import {
  BROWSER_BACKED_INTENDED_CHECK,
  BROWSER_BACKED_SCENARIOS,
  BROWSER_BACKED_SUBJECTS,
  type BrowserBackedCheck,
  type BrowserBackedSubjectId,
} from "./scenarios.js";

const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const json = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

interface CellState {
  readonly calls: BrowserHarnessCall[];
  readonly effects: string[];
  confirmationAccepted: boolean;
  attemptedBeforeEnabled: boolean;
  staleHandleError: boolean;
  modelCalls: number;
  completed: boolean;
}

const trace = (
  state: CellState,
  replayIndex: number,
  method: BrowserHarnessCall["method"],
  detail: string,
): void => {
  state.calls.push({
    seq: state.calls.length + 1,
    replayIndex,
    method,
    target: null,
    detail,
  });
};

function htmlFor(scenarioId: string): string {
  if (scenarioId === "browser-anchor-conflict-hidden-confirmation") {
    return `<!doctype html>
<html><body>
<main id="app">
  <section id="cart-panel">
    <button data-testid="approve-action" data-entity="cart-17" data-effect="approve-cart" data-precondition="ready">Approve item</button>
  </section>
  <section id="review-panel">
    <button data-testid="review-approve-action" data-entity="order-17" data-effect="approve-order" data-precondition="ready">Approve order</button>
  </section>
  <div id="confirm" role="dialog" hidden><button id="confirm-yes">Confirm approval</button></div>
</main>
<script>
window.__effects = [];
document.querySelector('[data-effect="approve-cart"]').addEventListener('click', () => window.__effects.push('approve-cart'));
document.querySelector('[data-effect="approve-order"]').addEventListener('click', () => { document.querySelector('#confirm').hidden = false; });
document.querySelector('#confirm-yes').addEventListener('click', () => window.__effects.push('approve-order'));
</script>
</body></html>`;
  }
  if (scenarioId === "browser-stale-handle-remount") {
    return `<!doctype html>
<html><body>
<main id="app">
  <form id="profile-panel">
    <button id="save" type="button" data-entity="profile-9" data-effect="save-profile" data-precondition="ready">Save profile</button>
  </form>
</main>
<script>
window.__effects = [];
function attach(el) { el.addEventListener('click', () => window.__effects.push('save-profile')); }
attach(document.querySelector('#save'));
window.__remountSave = () => {
  const old = document.querySelector('#save');
  const next = old.cloneNode(true);
  next.id = 'save-remounted';
  old.replaceWith(next);
  attach(next);
};
</script>
</body></html>`;
  }
  return `<!doctype html>
<html><body>
<main id="app">
  <section id="async-panel" class="async" aria-busy="false">
    <button id="submit-payment" disabled data-entity="payment-3" data-effect="submit-payment" data-precondition="enabled">Submit payment</button>
  </section>
</main>
<script>
window.__effects = [];
const button = document.querySelector('#submit-payment');
button.addEventListener('click', () => { if (!button.disabled) window.__effects.push('submit-payment'); });
setTimeout(() => { button.disabled = false; }, 35);
</script>
</body></html>`;
}

async function effects(page: Page): Promise<string[]> {
  return (await page.evaluate(() => (globalThis as { __effects?: string[] }).__effects ?? [])) as string[];
}

async function replayReference(page: Page, scenarioId: string, state: CellState): Promise<void> {
  if (scenarioId === "browser-anchor-conflict-hidden-confirmation") {
    trace(state, 0, "queryAnchor", "select by entity/effect/precondition, not global testid priority");
    await page.locator('[data-entity="order-17"][data-effect="approve-order"]').click();
    trace(state, 0, "acceptConfirmation", "mounted confirmation dialog observed");
    await page.locator("#confirm-yes").click();
    state.confirmationAccepted = true;
    return;
  }
  if (scenarioId === "browser-stale-handle-remount") {
    trace(state, 0, "query", "initial query observed before remount");
    await page.evaluate(() => (globalThis as unknown as { __remountSave: () => void }).__remountSave());
    trace(state, 0, "query", "handle refreshed after DOM remount");
    await page.locator('[data-entity="profile-9"][data-effect="save-profile"]').click();
    return;
  }
  trace(state, 0, "readAttribute", "aria-busy=false observed but not trusted as readiness");
  await page.locator("#submit-payment").waitFor({ state: "visible" });
  await page.locator("#submit-payment").click({ timeout: 2000 });
}

async function replaySubject(
  page: Page,
  subject: BrowserBackedSubjectId,
  scenarioId: string,
  state: CellState,
): Promise<void> {
  if (subject === "reference") {
    await replayReference(page, scenarioId, state);
    return;
  }
  if (
    subject === "testid-loyal-browser-mutant" &&
    scenarioId === "browser-anchor-conflict-hidden-confirmation"
  ) {
    trace(state, 0, "query", "selected first node matching recorded test id");
    await page.locator('[data-testid="approve-action"]').click();
    return;
  }
  if (subject === "stale-handle-reuser-browser-mutant" && scenarioId === "browser-stale-handle-remount") {
    trace(state, 0, "query", "captured persistent ElementHandle before mutation");
    const handle = await page.$('[data-entity="profile-9"][data-effect="save-profile"]');
    await page.evaluate(() => (globalThis as unknown as { __remountSave: () => void }).__remountSave());
    trace(state, 0, "click", "attempted to click stale handle after remount");
    try {
      await handle?.click({ timeout: 300 });
    } catch {
      state.staleHandleError = true;
    }
    return;
  }
  if (subject === "aria-busy-truster-browser-mutant" && scenarioId === "browser-aria-busy-late-enable") {
    const busy = await page.locator("#async-panel").getAttribute("aria-busy");
    trace(state, 0, "readAttribute", `trusted aria-busy=${busy}`);
    if (busy === "false") {
      state.attemptedBeforeEnabled = await page.locator("#submit-payment").isDisabled();
      await page.locator("#submit-payment").evaluate((el) => (el as { click: () => void }).click());
    }
    return;
  }
  await replayReference(page, scenarioId, state);
}

function verifyCell(
  subject: BrowserBackedSubjectId,
  scenarioId: string,
  state: CellState,
): BrowserBackedCheck[] {
  const failures = new Set<BrowserBackedCheck>();
  const expectedEffect =
    scenarioId === "browser-anchor-conflict-hidden-confirmation"
      ? "approve-order"
      : scenarioId === "browser-stale-handle-remount"
        ? "save-profile"
        : "submit-payment";
  if (!state.completed) failures.add("browser_replay_completes");
  if (state.modelCalls > 0) failures.add("no_model_in_replay");
  if (state.effects.filter((effect) => effect === expectedEffect).length > 1) {
    failures.add("no_duplicate_side_effects");
  }
  if (!state.effects.includes(expectedEffect)) {
    if (scenarioId === "browser-anchor-conflict-hidden-confirmation")
      failures.add("correct_anchor_resolution");
    if (scenarioId === "browser-stale-handle-remount") failures.add("stale_handle_detected");
    if (scenarioId === "browser-aria-busy-late-enable") failures.add("precondition_observed");
  }
  if (
    scenarioId === "browser-anchor-conflict-hidden-confirmation" &&
    subject === "testid-loyal-browser-mutant" &&
    !state.confirmationAccepted
  ) {
    failures.add("hidden_confirmation_respected");
  }
  if (state.staleHandleError) failures.add("stale_handle_detected");
  if (state.attemptedBeforeEnabled) failures.add("precondition_observed");
  return [...failures].sort();
}

async function runCell(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  subject: BrowserBackedSubjectId,
  scenarioId: string,
  artifactDir: string,
): Promise<BrowserBackedCell> {
  const page = await browser.newPage();
  const state: CellState = {
    calls: [],
    effects: [],
    confirmationAccepted: false,
    attemptedBeforeEnabled: false,
    staleHandleError: false,
    modelCalls: 0,
    completed: true,
  };
  try {
    await page.setContent(htmlFor(scenarioId), { waitUntil: "domcontentloaded" });
    await replaySubject(page, subject, scenarioId, state);
    await page.waitForTimeout(60);
    state.effects.push(...(await effects(page)));
  } catch (err) {
    state.completed = false;
    trace(state, 0, "settle", `browser replay error: ${(err as Error).message.slice(0, 180)}`);
  }
  const cellDir = join(artifactDir, `${scenarioId}__${subject}`);
  mkdirSync(cellDir, { recursive: true });
  const failures = verifyCell(subject, scenarioId, state);
  const artifacts = {
    pageSnapshotPath: `artifacts/${scenarioId}__${subject}/page.html`,
    browserTracePath: `artifacts/${scenarioId}__${subject}/browser-trace.json`,
    harnessCallLedgerPath: `artifacts/${scenarioId}__${subject}/calls.json`,
    effectLedgerPath: `artifacts/${scenarioId}__${subject}/effects.json`,
    verifierOutputPath: `artifacts/${scenarioId}__${subject}/verifier-output.json`,
  };
  writeFileSync(join(cellDir, "page.html"), await page.content(), "utf8");
  writeFileSync(
    join(cellDir, "browser-trace.json"),
    json({ scenarioId, subjectId: subject, driver: "playwright", calls: state.calls }),
    "utf8",
  );
  writeFileSync(join(cellDir, "calls.json"), json(state.calls), "utf8");
  writeFileSync(join(cellDir, "effects.json"), json(state.effects), "utf8");
  writeFileSync(
    join(cellDir, "verifier-output.json"),
    json({ scenarioId, subjectId: subject, failures, intended: BROWSER_BACKED_INTENDED_CHECK }),
    "utf8",
  );
  await page.close();
  return { scenarioId, subjectId: subject, failures, artifacts };
}

export async function runBrowserBackedMeasurement(options: {
  readonly root: string;
  readonly out?: string;
  readonly executablePath?: string;
}): Promise<BrowserBackedMeasurement> {
  const out = options.out ?? browserBackedMeasurementPath(options.root);
  const artifactDir = join(dirname(out), "artifacts");
  mkdirSync(artifactDir, { recursive: true });
  const executablePath = options.executablePath ?? process.env.FOUNDRY_CHROME_PATH ?? DEFAULT_CHROME;
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const cells: BrowserBackedCell[] = [];
    for (const scenario of BROWSER_BACKED_SCENARIOS) {
      for (const subject of BROWSER_BACKED_SUBJECTS) {
        cells.push(await runCell(browser, subject, scenario.scenarioId, artifactDir));
      }
    }
    const measurement: BrowserBackedMeasurement = {
      schema: "agent-eval-foundry/browser-backed-measurement@1",
      familyId: BROWSER_BACKED_FAMILY_ID,
      driver: "playwright",
      browserEngine: "chromium",
      browserExecutable: executablePath,
      scenariosMeasured: BROWSER_BACKED_SCENARIOS.length,
      subjectsMeasured: BROWSER_BACKED_SUBJECTS.length,
      cells,
    };
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, json(measurement), "utf8");
    return measurement;
  } finally {
    await browser.close();
  }
}

if ((process.argv[1] ?? "").includes("ui-replay-browser-backed/runner")) {
  const outIndex = process.argv.indexOf("--out");
  const rootIndex = process.argv.indexOf("--root");
  const executableIndex = process.argv.indexOf("--browser-executable");
  runBrowserBackedMeasurement({
    root: rootIndex === -1 ? process.cwd() : (process.argv[rootIndex + 1] ?? process.cwd()),
    ...(outIndex === -1 || process.argv[outIndex + 1] === undefined
      ? {}
      : { out: process.argv[outIndex + 1] }),
    ...(executableIndex === -1 || process.argv[executableIndex + 1] === undefined
      ? {}
      : { executablePath: process.argv[executableIndex + 1] }),
  })
    .then((measurement) => {
      process.stdout.write(
        `browser-backed ${measurement.scenariosMeasured} scenario(s), ${measurement.cells.length} cell(s)\n`,
      );
    })
    .catch((err) => {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exitCode = 1;
    });
}
