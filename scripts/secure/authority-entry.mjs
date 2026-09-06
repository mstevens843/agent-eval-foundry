#!/usr/bin/env node
// Trusted code arrives only on authority fd0, never in the submission mount.
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { executeAuthority } from "./authority-engine.mjs";

const [cellPath, modulePath] = process.argv.slice(2);
const finish = (result) => process.stdout.write(JSON.stringify(result), () => process.exit(0));
try {
  if (process.getuid?.() !== 0) throw Error("authority requires a separate privileged identity");
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const directory = mkdtempSync("/tmp/authority-private-");
  chmodSync(directory, 0o700);
  const adapterPath = `${directory}/adapter.mjs`;
  writeFileSync(adapterPath, payload.adapterSource, { mode: 0o600, flag: "wx" });
  // Positive control: the authoritative process can read the exact privileged file the negative
  // fixture attempts. A missing/broken probe must not masquerade as isolation.
  if (readFileSync(adapterPath, "utf8") !== payload.adapterSource)
    throw Error("authority private-file positive control failed");
  const { createAuthority } = await import(pathToFileURL(adapterPath).href);
  let nextUid = 1000;
  const context = {
    execute: (adapter) => executeAuthority(adapter, { cellPath, modulePath, uid: nextUid++ }),
  };
  finish(await context.execute(createAuthority(payload.input, context)));
} catch (error) {
  finish({
    error: `authority setup failed: ${String(error?.message ?? error)}`,
    channels: {},
    report: null,
    diagnostics: { stdoutTail: "", stderrTail: "" },
  });
}
