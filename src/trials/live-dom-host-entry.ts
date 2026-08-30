#!/usr/bin/env node
// Bundled into scripts/live-dom-host.mjs. The checked-in script is self-contained so `pnpm test`
// does not depend on a prior `dist/` build.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { App } from "../families/ui-replay-live-dom/app.js";
import type { Scenario } from "../families/ui-replay-live-dom/truth.js";
import type { ReplayReport, Subject } from "../families/ui-replay-live-dom/types.js";

const fail = (message: string): never => {
  process.stdout.write(JSON.stringify({ error: message }));
  process.exit(0);
};

const modulePath = process.argv[2] ?? fail("no subject module path given");

let input: unknown;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (err) {
  fail(`could not parse stdin: ${(err as Error).message}`);
}

const scenario = (input as { scenario?: Scenario } | null)?.scenario ?? fail("stdin carried no scenario");

let subject: Subject | undefined;
try {
  const mod = (await import(pathToFileURL(modulePath).href)) as { subject?: Subject; default?: Subject };
  subject = mod.subject ?? (mod.default as Subject);
} catch (err) {
  fail(`could not import subject: ${(err as Error).message}`);
}
const hasReplay = (candidate: Subject | undefined): candidate is Subject =>
  typeof candidate?.replay === "function";

if (!hasReplay(subject)) {
  fail("module exports no subject with a replay(trace, app) method");
}
const runnableSubject = subject as Subject;

const app = new App(scenario.params, scenario.trace);
const reports: ReplayReport[] = [];

try {
  for (let i = 0; i < scenario.params.replayCount; i += 1) {
    app.beginReplay(i);
    reports.push(runnableSubject.replay(scenario.trace, app.facade()));
  }
} catch (err) {
  process.stdout.write(
    JSON.stringify({
      reports,
      effects: app.sealedEffects(),
      calls: app.sealedCalls(),
      legitimate: Object.fromEntries(
        [...app.sealedLegitimate()].map(([step, ids]) => [String(step), [...ids].sort()]),
      ),
      error: `subject threw: ${(err as Error).message}`,
    }),
  );
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    reports,
    effects: app.sealedEffects(),
    calls: app.sealedCalls(),
    legitimate: Object.fromEntries(
      [...app.sealedLegitimate()].map(([step, ids]) => [String(step), [...ids].sort()]),
    ),
    error: null,
  }),
);
