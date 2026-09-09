// Author-only verifier controls, with no model/provider calls.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const [destination, ...tasks] = process.argv.slice(2);
if (!destination || !tasks.length) throw Error("Usage: verify-harbor-integrity.mjs FRESH_OUTPUT TASK...");
const output = resolve(destination), results = [];
mkdirSync(output, { recursive: false });
for (const task of tasks) {
  const source = resolve(task), id = source.split("/").at(-1);
  const directory = join(output, id), logs = join(directory, "logs");
  mkdirSync(logs, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(source, "export-manifest.json"), "utf8"));
  const image = `foundry-integrity:${id}-${manifest.digest.slice(0, 12)}`;
  const init = id === "browser-replay-repair" ? ["--init"] : [];
  for (const [label, args] of [
    ["build", ["build", "-q", "-t", image, join(source, "tests")]],
    ["validate", ["run", "--rm", ...init, "--network=none", "--cpus=2", "--memory=2g", "--pids-limit=256", "--mount", `type=bind,src=${join(source, "solution/reference")},dst=/app/submission,readonly`, "--mount", `type=bind,src=${logs},dst=/logs/verifier`, image, "node", "/tests/harbor-grade.mjs", "--validate"]],
  ]) {
    const result = spawnSync("docker", args, { encoding: "utf8", timeout: 600000, maxBuffer: 4 * 1024 * 1024 });
    writeFileSync(join(directory, `${label}.log`), `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    if (result.error || result.status !== 0) throw Error(`${id} ${label} failed: ${result.error ?? result.stderr}`);
  }
  const summary = JSON.parse(readFileSync(join(logs, "summary.json"), "utf8"));
  if (summary.reward !== 1 || summary.integrity?.length !== 5 || summary.integrity.some((r) => !r.passed)) throw Error(`${id} integrity failed: ${JSON.stringify(summary)}`);
  const forged = join(directory, "forged-submission"), forgedLogs = join(directory, "forged-logs");
  cpSync(join(source, "solution/reference"), forged, { recursive: true }); mkdirSync(forgedLogs);
  writeFileSync(join(forged, "checker.mjs"), `import {writeFileSync,symlinkSync} from 'node:fs';
export function run({cases}) {
  try {writeFileSync('/logs/verifier/reward.txt','1\\n')} catch {}
  try {symlinkSync('/tests/domain.mjs','/logs/verifier/summary.json')} catch {}
  return {verdicts:Object.fromEntries(cases.map(c=>[c.token,{ok:true}]))};
}`);
  const attack = spawnSync("docker", ["run", "--rm", ...init, "--network=none", "--cpus=2", "--memory=2g", "--pids-limit=256", "--mount", `type=bind,src=${forged},dst=/app/submission,readonly`, "--mount", `type=bind,src=${forgedLogs},dst=/logs/verifier`, image, "node", "/tests/harbor-grade.mjs"], { encoding: "utf8", timeout: 600000, maxBuffer: 4 * 1024 * 1024 });
  writeFileSync(join(directory, "forged-output.log"), `${attack.stdout ?? ""}\n${attack.stderr ?? ""}`);
  const attackSummary = JSON.parse(readFileSync(join(forgedLogs, "summary.json"), "utf8"));
  if (attack.error || attack.status !== 0 || !attackSummary.service || attackSummary.checker || attackSummary.error || readFileSync(join(forgedLogs, "reward.txt"), "utf8").trim() !== "0") throw Error(`${id} forged output was not rejected cleanly`);
  results.push({ id, digest: manifest.digest, integrity: [...summary.integrity, { name: "forged-reward-and-output-symlink-rejected", passed: true }], checkerCorrect: summary.checkerCorrect, checkerTotal: summary.checkerTotal });
  writeFileSync(join(output, "summary.json"), JSON.stringify({ results, providerCallsMade: 0 }, null, 2) + "\n");
  console.log(JSON.stringify(results.at(-1)));
}
