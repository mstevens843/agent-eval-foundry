import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
const [name, command, ...args] = process.argv.slice(2);
if (!name || !command) throw Error("Usage: record-next-five-command NAME COMMAND ARG...");
const root = ".local/next-five-successors-2026-09-10/commands";
mkdirSync(root, { recursive: true });
const log = join(root, name + ".log"),
  record = join(root, name + ".json");
writeFileSync(log, "", { flag: "wx" });
const start = new Date(),
  child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
for (const stream of [child.stdout, child.stderr])
  stream.on("data", (data) => {
    appendFileSync(log, data);
    process.stdout.write(data);
  });
child.on("error", (error) => {
  writeFileSync(
    record,
    JSON.stringify({ command, args, start: start.toISOString(), error: String(error) }, null, 2),
  );
  process.exitCode = 1;
});
child.on("close", (code, signal) => {
  writeFileSync(
    record,
    JSON.stringify(
      {
        command,
        args,
        cwd: process.cwd(),
        start: start.toISOString(),
        end: new Date().toISOString(),
        exitCode: code,
        signal,
        log,
        providerCallsMade: 0,
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = code ?? 1;
});
