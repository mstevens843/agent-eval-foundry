#!/usr/bin/env node
// The subprocess host. Runs ONE subject against ONE scenario, in a process the grader does not share.
//
// This exists so an agent-submitted artifact can be executed without handing it the memory that
// decides whether it passed. The parent sends a scenario on stdin; this process imports the subject,
// builds a fresh tool harness, runs it, and prints `{ledger, report}` on stdout. The parent then
// grades that output with a verifier the child never touched.
//
// The child builds its own ledger, so a hostile child could return a fabricated one. That is not a
// hole, it is the reason the verifier cross-checks the subject's reported decisions against the
// ledger instead of trusting either in isolation: a lie has to be consistent across both, and the
// verifier's expectations come from the scenario, which the child cannot rewrite in the parent.
//
// Usage:  node scripts/subject-host.mjs <path-to-subject-module>   < {"scenario": ...}
//
// The module must export `subject` (or a default) matching the family's Subject interface.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const fail = (message) => {
  process.stdout.write(JSON.stringify({ error: message }));
  process.exit(0); // exit 0: a failed subject is data, not a harness failure
};

const modulePath = process.argv[2];
if (modulePath === undefined) fail("no subject module path given");

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (err) {
  fail(`could not parse stdin: ${err.message}`);
}
const scenario = input?.scenario;
if (scenario === undefined) fail("stdin carried no scenario");

let subject;
try {
  const mod = await import(pathToFileURL(modulePath).href);
  subject = mod.subject ?? mod.default;
} catch (err) {
  fail(`could not import subject: ${err.message}`);
}
if (typeof subject?.run !== "function") fail("module exports no subject with a run() method");

// The harness is rebuilt here rather than imported from the family, so the host stays usable for any
// family whose subjects take (scenario, tools) and return a report.
let seq = 0;
const ledger = [];
const tools = Object.freeze({
  specs: scenario.tools ?? [],
  invoke(actionId, call) {
    seq += 1;
    ledger.push({ seq, tool: call.tool, args: call.args, actionId });
    return {
      ok: true,
      output: {
        id: `tool-out-${seq}`,
        trust: "tool_output",
        text: `${call.tool} completed`,
        carriesSecret: false,
      },
    };
  },
});

try {
  const report = subject.run(scenario, tools);
  process.stdout.write(JSON.stringify({ ledger, report }));
} catch (err) {
  process.stdout.write(JSON.stringify({ ledger, error: `subject threw: ${err.message}` }));
}
