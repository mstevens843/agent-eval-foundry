// Trusted entry. Only host-owned input is materialized here; no submitted path is imported by root.
import { mkdirSync, writeFileSync, chmodSync, chownSync } from "node:fs";
let text = "";
for await (const chunk of process.stdin) {
  text += chunk;
  if (Buffer.byteLength(text) > 16 * 1024 * 1024) throw Error("input limit");
}
const input = JSON.parse(text);
mkdirSync("/tmp/authority", { mode: 0o700 });
for (const file of input.files) {
  if (
    !/^[a-zA-Z0-9_.\/-]+$/.test(file.path) ||
    file.path.split("/").some((x) => !x || x === ".." || x === ".")
  )
    throw Error("private path");
  const path = `/tmp/authority/${file.path}`;
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true, mode: 0o700 });
  writeFileSync(path, file.text, { flag: "wx", mode: 0o600 });
}
mkdirSync("/work", { recursive: true });
chmodSync("/work", 0o755);
const client = input.files.find((f) => f.path === "cell-entry.mjs");
if (!client) throw Error("client missing");
writeFileSync("/tmp/client.mjs", client.text, { flag: "wx", mode: 0o644 });
const { run } = await import("/tmp/authority/runner.mjs");
const result = await run(input);
process.stdout.write(JSON.stringify(result), () => process.exit(0));
