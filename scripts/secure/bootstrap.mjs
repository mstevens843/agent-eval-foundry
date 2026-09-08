// Trusted bootstrap, passed as node -e code. Only public files enter /work; the private adapter
// and input continue over a root-only pipe. No host directory needs sharing with the Docker VM.
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

try {
  if (process.getuid() !== 0) throw Error("bootstrap requires authority identity");
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const required = ["authority-entry.mjs", "authority-engine.mjs", "cell-entry.mjs", "protocol.mjs", "subject.mjs"];
  const allowed = new Set([...required, "checker.mjs"]);
  const files = payload.publicFiles;
  if (!files || Array.isArray(files) || typeof files !== "object" ||
      required.some(name => typeof files[name] !== "string") ||
      Object.keys(files).some(name => !allowed.has(name))) throw Error("invalid public file envelope");
  let total = 0;
  for (const [name, encoded] of Object.entries(files)) {
    if (typeof encoded !== "string" || encoded.length > 12 * 1024 * 1024) throw Error("public file size");
    const bytes = Buffer.from(encoded, "base64");
    total += bytes.length;
    if (bytes.length > 8 * 1024 * 1024 || total > 20 * 1024 * 1024) throw Error("public byte budget");
    writeFileSync(`/work/${name}`, bytes, { mode: 0o444, flag: "wx" });
  }
  // Root owns these inodes. No subject UID can replace, rename, chmod or append to them. This is
  // enforced by OS permissions, with neither DAC_OVERRIDE nor FOWNER in the container capability set.
  chmodSync("/work", 0o555);
  delete payload.publicFiles;
  const result = spawnSync(process.execPath,
    ["/work/authority-entry.mjs", "/work/cell-entry.mjs", "/work/subject.mjs"], {
      input: JSON.stringify(payload), stdio: ["pipe", "inherit", "inherit"],
      cwd: "/work",
      env: { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/tmp" },
    });
  if (result.error || result.status !== 0 || result.signal)
    throw Error(`authority launch failed: ${result.error?.message ?? result.signal ?? result.status}`);
} catch (error) {
  process.stderr.write(`authority bootstrap failed: ${String(error?.message ?? error)}\n`);
  process.exitCode = 125;
}
