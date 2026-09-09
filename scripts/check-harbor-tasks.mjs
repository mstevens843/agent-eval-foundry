// Run pinned upstream static checks without a container or runtime dependency install.
import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve, delimiter } from "node:path";
const [destination, checksDirectory, ...tasks] = process.argv.slice(2);
if (!destination || !checksDirectory || !tasks.length) throw Error("Usage: check-harbor-tasks.mjs FRESH_OUTPUT CHECKS_DIR TASK...");
const output = resolve(destination), bin = join(output, "bin");
mkdirSync(output, { recursive: false }); mkdirSync(bin);
let python;
for (const command of ["python3.13", "python3.12", "python3.11", "python3"]) {
  try { python = execFileSync(command, ["-c", "import tomllib,sys;print(sys.executable)"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); break; } catch {}
}
if (!python) throw Error("Python 3.11+ is required for upstream TOML checks");
symlinkSync(python, join(bin, "python3"));
const checks = readdirSync(checksDirectory).filter((name) => /^check-.*\.sh$/.test(name)).sort();
if (!checks.length) throw Error("No upstream checks found");
const results = [];
for (const task of tasks) for (const name of checks) {
  const result = spawnSync("bash", [resolve(checksDirectory, name), resolve(task)], {
    encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}` },
  });
  const log = `${task.split("/").at(-1)}-${name}.log`;
  writeFileSync(join(output, log), `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  results.push({ task, check: name, passed: !result.error && result.status === 0, log, error: result.error?.message });
}
writeFileSync(join(output, "summary.json"), JSON.stringify({ checks: checks.length, results, providerCallsMade: 0 }, null, 2) + "\n");
console.log(JSON.stringify({ passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed) }));
if (results.some((r) => !r.passed)) process.exitCode = 1;
