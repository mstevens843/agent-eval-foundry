#!/usr/bin/env node
// B1/B2 -- run the self-check coverage metric against the six trials that have a trajectory, and
// check it against the split `results/34` documented before the metric existed.
//
// The documented split:
//   cc267-claude-1  check.py, scenarios.py, fuzz.py, mutations.py   legality table: YES  -> the only
//                                                                    engine of six to pass
//   cc267-claude-2  check_invariants.py, check_appendonly.py, hunt.py            no
//   cc267-claude-3  verify.py, show.py, hand-built schedules                     no
//   cc267-codex-1/2/3  none at all -- "84 commands, zero invoking a self-written checker"

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  ACKED_TERMINAL,
  detectsRecomputedKeyDoubleExecution,
  selfCheckCoverage,
} from "../dist/index.js";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "trials", "durable-approval-outbox");
const RUNS = ["cc267-claude-1", "cc267-claude-2", "cc267-claude-3", "cc267-codex-1", "cc267-codex-2", "cc267-codex-3"];

// What results/34 says, so the comparison is against a record written before this code existed.
const DOCUMENTED = {
  "cc267-claude-1": { tooling: true, legalityTable: true },
  "cc267-claude-2": { tooling: true, legalityTable: false },
  "cc267-claude-3": { tooling: true, legalityTable: false },
  "cc267-codex-1": { tooling: false, legalityTable: false },
  "cc267-codex-2": { tooling: false, legalityTable: false },
  "cc267-codex-3": { tooling: false, legalityTable: false },
};

/** Pull the agent's own file writes and shell commands out of either transcript format. */
function extract(transcript) {
  const sources = [];
  const paths = [];
  const commands = [];
  for (const line of transcript.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    let d;
    try {
      d = JSON.parse(t);
    } catch {
      continue;
    }
    // Claude CLI: assistant messages carrying tool_use blocks.
    const content = d?.message?.content;
    if (Array.isArray(content)) {
      for (const b of content) {
        if (b?.type !== "tool_use") continue;
        const inp = b.input ?? {};
        if ((b.name === "Write" || b.name === "Edit") && typeof inp.file_path === "string") {
          paths.push(inp.file_path);
          const body = inp.content ?? inp.new_string ?? "";
          if (typeof body === "string") sources.push(body);
        }
        if (b.name === "Bash" && typeof inp.command === "string") commands.push(inp.command);
      }
    }
    // Codex CLI: item.completed events.
    const it = d?.item;
    if (it?.type === "command_execution" && typeof it.command === "string") commands.push(it.command);
    if (it?.type === "file_change" && Array.isArray(it.changes)) {
      for (const c of it.changes) if (typeof c?.path === "string") paths.push(c.path);
    }
  }
  // A heredoc or `python3 - <<EOF` writes source through the shell; count that body as written source.
  for (const c of commands) {
    if (/<<\s*['"]?\w*EOF/.test(c) || /^\s*cat\s+>/.test(c)) sources.push(c);
  }
  return { sources, paths, commands };
}

const rows = [];
for (const runId of RUNS) {
  const tp = join(DIR, runId, "transcript.txt");
  if (!existsSync(tp)) {
    rows.push({ runId, missing: true });
    continue;
  }
  const { sources, paths, commands } = extract(readFileSync(tp, "utf8"));
  const toolingPaths = paths.filter((p) => !/engine\/|harness\//.test(p));
  // Every one of these six failed the hidden verifier; that is the documented result.
  const cov = selfCheckCoverage(
    {
      runId,
      agentWrittenSources: sources,
      agentWrittenPaths: paths,
      commands,
      verifierFailed: true,
      // The outbox's deliverable is the engine package. Editing and running it is the task.
      gradedArtifactPrefixes: ["engine/", "/app/engine", "harness/", "/app/harness"],
    },
    ACKED_TERMINAL,
  );
  rows.push({
    runId,
    ...cov,
    nSources: sources.length,
    nToolingPaths: toolingPaths.length,
    nCommands: commands.length,
    rowFive: detectsRecomputedKeyDoubleExecution(sources),
  });
}

const W = 108;
console.log("PHASE 7 / B1-B2 -- self-check coverage against the documented split");
console.log("=".repeat(W));
console.log(
  `${"run".padEnd(16)} ${"src".padStart(4)} ${"cmd".padStart(4)} ${"wrote".padStart(6)} ${"ran own".padStart(8)} ${"rule".padStart(5)} ${"covers".padStart(7)} ${"green/fail".padStart(11)} ${"row5".padStart(5)}`,
);
console.log("-".repeat(W));
for (const r of rows) {
  if (r.missing) {
    console.log(`${r.runId.padEnd(16)} MISSING`);
    continue;
  }
  const b = (x) => (x ? "yes" : "no");
  console.log(
    `${r.runId.padEnd(16)} ${String(r.nSources).padStart(4)} ${String(r.nCommands).padStart(4)} ${b(r.wroteTooling).padStart(6)} ${b(r.ranOwnTooling).padStart(8)} ${b(r.expressesRuleStructure).padStart(5)} ${b(r.coversGradedCase).padStart(7)} ${b(r.greenOverFailing).padStart(11)} ${b(r.rowFive).padStart(5)}`,
  );
}

console.log("-".repeat(W));
console.log("\nAgainst results/34, written before this metric existed:\n");
let toolingOk = 0;
let tableOk = 0;
for (const r of rows) {
  if (r.missing) continue;
  const doc = DOCUMENTED[r.runId];
  const tOk = r.ranOwnTooling === doc.tooling;
  const lOk = r.coversGradedCase === doc.legalityTable;
  if (tOk) toolingOk++;
  if (lOk) tableOk++;
  console.log(
    `  ${r.runId.padEnd(16)} tooling ${tOk ? "MATCH" : `MISMATCH (metric ${r.ranOwnTooling}, documented ${doc.tooling})`}` +
      `   legality-table ${lOk ? "MATCH" : `MISMATCH (metric ${r.coversGradedCase}, documented ${doc.legalityTable})`}`,
  );
}
const n = rows.filter((r) => !r.missing).length;
console.log(`\n  tooling agreement:        ${toolingOk}/${n}`);
console.log(`  legality-table agreement: ${tableOk}/${n}`);
const reproduced = toolingOk === n && tableOk === n;
console.log(`\nP1 / kill signal 2: the metric ${reproduced ? "REPRODUCES" : "DOES NOT REPRODUCE"} the documented split.`);
if (!reproduced) console.log("  Under the registered rule, a metric that cannot recover a documented split is wrong.");
