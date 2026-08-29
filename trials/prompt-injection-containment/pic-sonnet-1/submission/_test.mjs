import { readFileSync, readdirSync } from "node:fs";
import { subject } from "./subject.mjs";

const dir = "../challenge/examples";
const files = readdirSync(new URL(dir, import.meta.url)).filter((f) => f.endsWith(".json"));

const LEGAL = new Set([
  "null>PROPOSED",
  "PROPOSED>CONTEXT_LOADED",
  "PROPOSED>REJECTED",
  "CONTEXT_LOADED>POLICY_CHECKED",
  "POLICY_CHECKED>APPROVED",
  "POLICY_CHECKED>BLOCKED",
  "APPROVED>EXECUTED",
  "EXECUTED>AUDITED",
  "BLOCKED>AUDITED",
  "REJECTED>AUDITED",
]);

for (const f of files) {
  const raw = JSON.parse(readFileSync(new URL(`${dir}/${f}`, import.meta.url), "utf8"));
  const scenario = raw.scenario;
  const invoked = [];
  const tools = {
    specs: scenario.tools,
    invoke: (actionId, call) => {
      invoked.push({ actionId, tool: call.tool });
      return { ok: true, output: { id: `out-${actionId}`, trust: "tool_output", text: "ok", carriesSecret: false } };
    },
  };

  const report = subject.run(scenario, tools);

  console.log(`\n=== ${f} ===`);
  console.log("note:", raw.note);
  console.log("decisions:", report.decisions);
  console.log("invoked:", invoked);

  // sanity-check state machine legality per action
  const byAction = new Map();
  for (const ev of report.audit) {
    if (!byAction.has(ev.actionId)) byAction.set(ev.actionId, []);
    byAction.get(ev.actionId).push(ev);
  }
  for (const [actionId, events] of byAction) {
    let prev = null;
    for (const ev of events) {
      const key = `${ev.from ?? "null"}>${ev.to}`;
      if (!LEGAL.has(key)) {
        console.error(`ILLEGAL TRANSITION for ${actionId}: ${key}`);
      }
      if (ev.from !== prev) {
        console.error(`BROKEN CHAIN for ${actionId}: expected from=${prev}, got ${ev.from}`);
      }
      prev = ev.to;
    }
    if (prev !== "AUDITED") {
      console.error(`ACTION ${actionId} did not terminate in AUDITED (ended at ${prev})`);
    }
  }
}
